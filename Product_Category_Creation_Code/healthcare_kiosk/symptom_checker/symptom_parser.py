# utils/symptom_parser.py
import re

def extract_duration(text):
    text = text.lower()
    pattern = r'(\d+)\s*(day|days|week|weeks|month|months|hour|hours)'
    match = re.search(pattern, text)
    if match:
        number = int(match.group(1))
        unit = match.group(2)

        if 'hour' in unit:
            return max(1, number // 24)  # treat hours as at least 1 day
        elif 'day' in unit:
            return number
        elif 'week' in unit:
            return number * 7
        elif 'month' in unit:
            return number * 30
    return None  # no duration found
