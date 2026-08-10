#!/usr/bin/env python3
"""
add_entry.py — the daily ritual.

Run this once a day after a CTF session. It asks a few questions,
appends your entry to data/challenges.json, and (optionally) commits
and pushes it for you so your GitHub contribution graph fills in.

Usage:
    python add_entry.py            # prompts for everything
    python add_entry.py --commit   # also runs git add/commit/push after saving
"""

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data" / "challenges.json"


def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def choose_from(label, options):
    print(f"\n{label}:")
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    while True:
        raw = input(f"{label} [1-{len(options)}]: ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1]
        print("  invalid choice, try again.")


def ask(prompt, required=True, default=""):
    while True:
        val = input(prompt).strip()
        if val:
            return val
        if not required:
            return default
        print("  this field is required.")


def main():
    data = load_data()
    domains = data.get("domains", [])
    difficulties = data.get("difficulties", ["Easy", "Medium", "Hard"])

    print("=== ctf-log: new entry ===")
    today = date.today().isoformat()
    entry_date = ask(f"Date [{today}]: ", required=False, default=today)

    title = ask("Challenge title: ")
    domain = choose_from("Domain", domains)
    difficulty = choose_from("Difficulty", difficulties)
    event = ask("CTF / platform (optional): ", required=False)
    summary = ask("One-line summary: ")
    print("Learnings (what you actually learned — techniques, gotchas, tools).")
    print("End input with an empty line.")
    lines = []
    while True:
        line = input()
        if line == "":
            break
        lines.append(line)
    learnings = "\n".join(lines)
    tools_raw = ask("Tools used, comma-separated (optional): ", required=False)
    tools = [t.strip() for t in tools_raw.split(",") if t.strip()]
    writeup_url = ask("Link to full writeup (optional): ", required=False)

    slug = "".join(c if c.isalnum() else "-" for c in title.lower()).strip("-")
    entry_id = f"{entry_date.replace('-', '')}-{slug}"[:80]

    new_entry = {
        "id": entry_id,
        "date": entry_date,
        "title": title,
        "domain": domain,
        "difficulty": difficulty,
        "event": event,
        "summary": summary,
        "learnings": learnings,
        "tools": tools,
        "writeup_url": writeup_url,
    }

    data.setdefault("entries", []).append(new_entry)
    save_data(data)
    print(f"\nSaved entry '{title}' to {DATA_PATH}")

    if "--commit" in sys.argv:
        repo_dir = Path(__file__).parent
        try:
            subprocess.run(["git", "add", "data/challenges.json"], cwd=repo_dir, check=True)
            subprocess.run(
                ["git", "commit", "-m", f"log: {title} ({domain}/{difficulty})"],
                cwd=repo_dir, check=True,
            )
            subprocess.run(["git", "push"], cwd=repo_dir, check=True)
            print("Committed and pushed.")
        except subprocess.CalledProcessError as e:
            print(f"\ngit step failed: {e}\nSave was still written — commit/push manually.")
    else:
        print("Now run:")
        print("  git add data/challenges.json")
        print(f'  git commit -m "log: {title} ({domain}/{difficulty})"')
        print("  git push")


if __name__ == "__main__":
    main()
