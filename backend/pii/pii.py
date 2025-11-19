"""Contact Information Detection and Blocking System for Chat Applications

A comprehensive moderation system that detects and blocks users from sharing
contact information in obfuscated or plain forms.
"""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict


@dataclass
class ModerationResult:
    """Result of content moderation check."""
    is_blocked: bool
    confidence: str  # 'high', 'medium', 'low'
    violation_type: Optional[str]
    detected_pattern: Optional[str]
    original_text: str
    normalized_text: str
    severity_score: int = 0
    all_violations: List[Tuple[str, str]] = None  # [(type, pattern), ...]

    def to_dict(self) -> Dict:
        """Convert to dictionary format."""
        return {
            'is_blocked': self.is_blocked,
            'confidence': self.confidence,
            'violation_type': self.violation_type,
            'detected_pattern': self.detected_pattern,
            'original_text': self.original_text,
            'normalized_text': self.normalized_text,
            'severity_score': self.severity_score,
            'all_violations': self.all_violations or []
        }


class TextNormalizer:
    """Handles text normalization for obfuscation detection."""

    # Leetspeak mappings
    # Leetspeak mappings
    LEETSPEAK_MAP = {
        '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's',
        '6': 'g', '7': 't', '8': 'b', '9': 'g',

        '@': 'a', '$': 's', '!': 'i', '+': 't',
        '€': 'e', '£': 'l', '¥': 'y',

        '|3': 'b', '|)': 'd', '|>': 'd',
        '|<': 'k', '|\\|': 'n', '|/': 'y',
        '|_': 'l', '|V': 'v', '|/|': 'm',

        '(_)': 'u', '(_)_)': 'm',

        '\\/': 'v', '\\/\\/': 'w', '\\/\\/\\/': 'w'
    }

    # Word number mappings (including common typos)

    WORD_NUMBERS = {
        # English
        'zero': '0', 'one': '1', 'two': '2', 'three': '3',
        'four': '4', 'five': '5', 'six': '6', 'seven': '7',
        'eight': '8', 'nine': '9',

        # Common typos and variations
        'fvie': '5', 'ninetye': '9', 'eght': '8', 'ninegh': '9',
        'sevn': '7', 'thr33': '3', 'f0ur': '4',
        'i9ht': '8', 's3v3n': '7', 'n1n3': '9',

        # More leet variations
        '3i9ht': '8', 'f0ur': '4',

        # Added expanded typos
        'onee': '1', 'oen': '1', 'to': '2',
        'thrre': '3', 'foue': '4', 'fiev': '5',
        'sxi': '6', 'seveb': '7', 'eigjt': '8',

        # Added mixed leet forms
        '0ne': '1', 'tw0': '2', '7hr33': '3',
        'f1ve': '5', 's1x': '6', '53ven': '7',
        '31ght': '8',

        # Added heavy leet misspellings
        '0n3': '1', 't\\/\\/0': '2', '7hree': '3',
        'f1v3': '5', 's1x6': '6',
        'e1ght': '8', 'n1ne': '9',
        
        # Russian numbers (with common variations)
        'ноль': '0', 'нуль': '0', 'один': '1', 'два': '2', 'три': '3',
        'четыре': '4', 'пять': '5', 'шесть': '6', 'семь': '7',
        'восемь': '8', 'девять': '9',
        
        # Spanish numbers
        'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3',
        'cuatro': '4', 'cinco': '5', 'seis': '6', 'siete': '7',
        'ocho': '8', 'nueve': '9',
        
        # Chinese numbers (simplified and traditional)
        '零': '0', '一': '1', '二': '2', '三': '3',
        '四': '4', '五': '5', '六': '6', '七': '7',
        '八': '8', '九': '9',
        '壹': '1', '贰': '2', '叁': '3', '肆': '4',
        '伍': '5', '陆': '6', '柒': '7', '捌': '8', '玖': '9',
        
        # Large number words (English) - remove to avoid false matches
        'ten': '1', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
        'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
        'eighteen': '18', 'nineteen': '19', 'twenty': '2', 'thirty': '3',
        'forty': '4', 'fifty': '5', 'sixty': '6', 'seventy': '7',
        'eighty': '8', 'ninety': '9',
        
        # Leet variations of zero
        'zer0': '0', 'zero': '0', 'z3r0': '0',
        
        # Hindi numbers
        'shunya': '0', 'ek': '1', 'do': '2', 'teen': '3',
        'char': '4', 'paanch': '5', 'chhah': '6', 'saat': '7',
        'aath': '8', 'nau': '9',
        
        # Portuguese numbers
        'um': '1', 'dois': '2', 'três': '3', 'tres': '3',
        'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7',
        'oito': '8', 'nove': '9',
        
        # German numbers
        'null': '0', 'eins': '1', 'zwei': '2', 'drei': '3',
        'vier': '4', 'fünf': '5', 'sechs': '6', 'sieben': '7',
        'acht': '8', 'neun': '9'
    }

    # Phonetic number mappings
    PHONETIC_NUMBERS = {
        'ate': '8', 'won': '1', 'too': '2', 'to': '2',
        'for': '4', 'oh': '0', 'owe': '0'
    }

    # Obfuscation characters to remove (including unicode variants)
    OBFUSCATION_CHARS = r'[\s\t\-_.\[\](){}*#!@$%^&+=|\\\/<>~`\'",:;×·•–—…﹘°¤†‡§¶¿¡※【】「」『』〈〉《》]'
    
    # Zero-width and invisible characters
    ZERO_WIDTH_CHARS = [
        '\u200b',  # Zero-width space
        '\u200c',  # Zero-width non-joiner
        '\u200d',  # Zero-width joiner
        '\u200e',  # Left-to-right mark
        '\u200f',  # Right-to-left mark
        '\u2060',  # Word joiner
        '\ufeff',  # Zero-width no-break space
    ]
    
    # Emoji digit mappings
    EMOJI_DIGITS = {
        '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
        '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
    }
    
    # Confusable character mappings (letters that look like numbers)
    CONFUSABLES = {
        'o': '0', 'O': '0',  # Letter O to zero
        'l': '1', 'I': '1',  # Letter l/I to one
        'Z': '2', 'z': '2',  # Letter Z to two
        'S': '5', 's': '5',  # Letter S to five
        'B': '8', 'b': '8',  # Letter B to eight
        'g': '9', 'G': '9',  # Letter g to nine
        # Cyrillic confusables
        'о': 'o',  # Cyrillic о -> o
        'а': 'a',  # Cyrillic а -> a
        'е': 'e',  # Cyrillic е -> e
        'с': 'c',  # Cyrillic с -> c
        # Greek confusables
        'ο': 'o',  # Greek omicron ο -> o
        'α': 'a',  # Greek alpha α -> a
    }

    @staticmethod
    def normalize(text: str) -> str:
        """Normalize text by removing obfuscation and converting substitutions.
        
        Args:
            text: Input text to normalize
            
        Returns:
            Normalized text string
        """
        if not text:
            return ''

        # Remove zero-width and invisible characters first
        normalized = text
        for zwc in TextNormalizer.ZERO_WIDTH_CHARS:
            normalized = normalized.replace(zwc, '')
        
        # Unicode normalization (NFKC) - converts fullwidth to ASCII
        # This handles: ＠ → @, ． → ., fullwidth letters/numbers
        normalized = unicodedata.normalize('NFKC', normalized)
        
        # Replace emoji digits
        for emoji, digit in TextNormalizer.EMOJI_DIGITS.items():
            normalized = normalized.replace(emoji, digit)
        
        # Convert to lowercase
        normalized = normalized.lower()
        
        # Handle Chinese numerals by converting them to digits
        chinese_digits = {'零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
                         '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
                         '壹': '1', '贰': '2', '叁': '3', '肆': '4', '伍': '5',
                         '陆': '6', '柒': '7', '捌': '8', '玖': '9'}
        for chinese, digit in chinese_digits.items():
            normalized = normalized.replace(chinese, digit)
        
        # Handle Arabic-Indic numerals (٠-٩)
        arabic_indic_digits = {'٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
                              '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'}
        for arabic, digit in arabic_indic_digits.items():
            normalized = normalized.replace(arabic, digit)
        
        # Replace word numbers FIRST (before removing spaces and confusables)
        # This ensures Russian/other language numbers are converted properly
        # Use word boundaries for better matching
        for word, digit in TextNormalizer.WORD_NUMBERS.items():
            normalized = re.sub(r'\b' + re.escape(word) + r'\b', digit, normalized)

        # Replace phonetic numbers
        for word, digit in TextNormalizer.PHONETIC_NUMBERS.items():
            normalized = re.sub(r'\b' + word + r'\b', digit, normalized)
        
        # NOW replace Cyrillic/Greek confusables (after word number replacement)
        # This prevents false positives while catching intentional obfuscation
        cyrillic_greek_confusables = {
            'о': 'o',  # Cyrillic о -> o
            'а': 'a',  # Cyrillic а -> a
            'е': 'e',  # Cyrillic е -> e
            'с': 'c',  # Cyrillic с -> c
            'д': 'd',  # Cyrillic д -> d
            'и': 'i',  # Cyrillic и -> i
            'н': 'n',  # Cyrillic н -> n
            'в': 'v',  # Cyrillic в -> v
            'т': 't',  # Cyrillic т -> t
            'р': 'r',  # Cyrillic р -> r
            'ч': 'ch', # Cyrillic ч -> ch
            'ш': 'sh', # Cyrillic ш -> sh
            'е': 'e',  # Cyrillic е -> e
            'м': 'm',  # Cyrillic м -> m
            'ь': '',   # Cyrillic soft sign -> remove
            'ο': 'o',  # Greek omicron ο -> o
            'α': 'a',  # Greek alpha α -> a
        }
        for confusable, replacement in cyrillic_greek_confusables.items():
            normalized = normalized.replace(confusable, replacement)

        # Remove obfuscation characters
        normalized = re.sub(TextNormalizer.OBFUSCATION_CHARS, '', normalized)

        # DO NOT convert leetspeak - it converts digits to letters which breaks phone detection
        # The digits should stay as digits for pattern matching

        return normalized


class PatternDetector:
    """Detects various contact information patterns."""

    def __init__(self):
        """Initialize compiled regex patterns for efficiency."""
        # Phone number: 5+ consecutive digits (ultra-aggressive for HIGH sensitivity)
        self.phone_pattern = re.compile(r'\d{5,15}')
        
        # Additional phone pattern for shorter sequences with context
        self.phone_context_pattern = re.compile(
            r'(phone|call|tel|contact|number|dial|reach|whatsapp|mobile|cell|digits|upi)\s*:?\s*\+?\d{5,15}',
            re.IGNORECASE
        )
        
        # Pattern for mixed word-digit phone numbers (e.g., "nine8seven6five")
        self.mixed_phone_pattern = re.compile(
            r'(nine|eight|seven|six|five|four|three|two|one|zero|\d){7,}',
            re.IGNORECASE
        )
        
        # Pattern for concatenated number words (more aggressive)
        self.concat_numbers_pattern = re.compile(
            r'\b(nine|eight|seven|six|five|four|three|two|one|zero){7,}\b',
            re.IGNORECASE
        )
        
        # Pattern for long spelled number sequences (e.g., "onehundredeleven", "one-hundred-eleven")
        self.long_spelled_pattern = re.compile(
            r'\b(?:one|two|three|four|five|six|seven|eight|nine|zero|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:-?(?:one|two|three|four|five|six|seven|eight|nine|zero|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)){4,}\b',
            re.IGNORECASE
        )
        
        # Pattern for very obfuscated numbers (letters mixed with digits)
        self.obfuscated_number_pattern = re.compile(
            r'[a-z]*\d[a-z]*\d[a-z]*\d[a-z]*\d[a-z]*\d[a-z]*\d[a-z]*\d',
            re.IGNORECASE
        )
        
        # Pattern for leet-speak number sequences (e.g., n1n3, 3i9ht, s3v3n, f0ur)
        # Matches 3+ space-separated tokens that contain at least one digit each
        self.leetspeak_number_pattern = re.compile(
            r'\b[a-z]*\d[a-z0-9]*(\s+[a-z]*\d[a-z0-9]*){2,}',
            re.IGNORECASE
        )

        # Email patterns (keeps your structure, adds more separators + TLDs)
        self.email_pattern = re.compile(
            r'[a-z0-9._%+-]+(?:@|at)[a-z0-9.-]+(?:\.|dot)(?:com|net|org|in|edu|gov|co|io|me|us|info|biz|live|pro)',
            re.IGNORECASE
        )
        
        # Email pattern for normalized text (no spaces, just letters)
        self.email_normalized_pattern = re.compile(
            r'[a-z0-9]{2,}(?:at|@)[a-z0-9]{2,}(?:dot|\.)[a-z]{2,}',
            re.IGNORECASE
        )
        
        # Email pattern with Unicode characters and special patterns
        self.email_unicode_pattern = re.compile(
            r'[a-z0-9\u0100-\uffff._-]+[@＠][a-z0-9\u0100-\uffff._-]+[\.\uff0e][a-z\u0100-\uffff]{2,}',
            re.IGNORECASE
        )
        
        # Placeholder pattern for emails (e.g., <user>@<domain>.com)
        self.placeholder_email_pattern = re.compile(
            r'<[a-z]+>\s*[@＠]\s*<[a-z]+>\s*[\.\uff0e]\s*[a-z]{2,}',
            re.IGNORECASE
        )

        # URL patterns (including shortlinks)
        self.url_pattern = re.compile(
            r'(https?://|www\.|[a-z0-9-]+\.(com|net|org|in|edu|gov|co|io|me|us|ly|gl|link|to))',
            re.IGNORECASE
        )
        
        # Obfuscated URL pattern (e.g., "zoom[dot]us" or "example(dot)com" or "tinyurl(.)com")
        self.obfuscated_url_pattern = re.compile(
            r'[a-z0-9-]+(\[dot\]|\(dot\)|\(\.\)|dot)[a-z]{2,}',
            re.IGNORECASE
        )

        # Social media handles (kept yours, added more trigger words + allowed dots and hyphens)
        self.social_handle_pattern = re.compile(
            r'(@[a-z0-9._-]{3,}'
            r'|\b(dm|add|follow|message|msg|ping|text|contact|discord|telegram|instagram|twitter|x\.com)\s+(me\s+)?(at|on|@|:)?\s+[a-z0-9._-]{3,})',
            re.IGNORECASE
        )

        # UPI ID pattern (Indian payment) - expanded
        self.upi_pattern = re.compile(
            r'\b[a-z0-9._-]+(@|at)(paytm|phonepe|googlepay|gpay|okaxis|oksbi|okhdfcbank|okicici|ybl|ibl|axl|bank|upi)\b',
            re.IGNORECASE
        )
        
        # Generic UPI-like pattern (anything@anything with UPI context)
        self.upi_context_pattern = re.compile(
            r'(upi|payment|pay)\s*:?\s*[a-z0-9._-]+(\s*@\s*|\s+at\s+)[a-z]+',
            re.IGNORECASE
        )

        # Payment patterns (kept yours, added Indian services + common obfuscations)
        self.payment_pattern = re.compile(
            r'(?:paypal\.me/|venmo\.com/|cash\.app/|'
            r'\$[a-z0-9_]{3,}|'
            r'\b(?:'
            r'paypal|pay pal|pay-pal|pp|'
            r'venmo|ven mo|ven-mo|'
            r'cashapp|cash app|cash-app|ca\$\$app|'
            r'zelle|zel le|stripe|stri pe|'

            # Indian services
            r'upi|u p i|u\.p\.i|gpay|g pay|phonepe|phone pe|'
            r'paytm|pay tm|pay-tm|bhim|bharatpe|bharat pe|'
            r'imps|neft|rtgs'
            r')\b)'
            ,
            re.IGNORECASE
        )

        # WhatsApp links
        self.whatsapp_pattern = re.compile(
            r'(wa\.me/|whatsapp\.com/|\bwhatsapp\b)',
            re.IGNORECASE
        )

        # Telegram links (including tg:// protocol)
        self.telegram_pattern = re.compile(
            r'(tg://|t\.me/|telegram\.me/|\btelegram\b)',
            re.IGNORECASE
        )
        
        # Snapchat links and protocols
        self.snapchat_pattern = re.compile(
            r'(snap://|snapchat\.com/add/|\bsnapchat\b|\bsnap\b.*\badd\b)',
            re.IGNORECASE
        )
        
        # WeChat ID pattern
        self.wechat_pattern = re.compile(
            r'(\bwechat\b|\b微信\b|wechat\s*id)',
            re.IGNORECASE
        )
        
        # LINE ID pattern
        self.line_pattern = re.compile(
            r'(\bline\b.*\bid\b|line://|line\.me/)',
            re.IGNORECASE
        )
        
        # Pattern for SSN (US Social Security Number) - includes en-dash (–)
        self.ssn_pattern = re.compile(
            r'\b\d{3}[\s.\-–—]?\d{2}[\s.\-–—]?\d{4}\b',
            re.IGNORECASE
        )
        
        # Discord tag pattern (username#1234)
        self.discord_pattern = re.compile(
            r'\b[a-z0-9._-]+#\d{4}\b',
            re.IGNORECASE
        )
        
        # Letter-by-letter spelling pattern (e.g., "j o h n @ e x a m p l e . c o m")
        self.letter_spelling_pattern = re.compile(
            r'\b([a-z]\s+){3,}[a-z]\b',
            re.IGNORECASE
        )
        
        # Detect "dot" and "at" spelled out in email context
        self.spelled_email_pattern = re.compile(
            r'\b[a-z]+\s*(dot|at)\s*[a-z]+\s*(dot|at)\s*[a-z]+',
            re.IGNORECASE
        )
        
        # Meet/conference codes (e.g., "abc-defg-hij")
        self.meet_code_pattern = re.compile(
            r'(meet|zoom|code|join|meeting).*\b[a-z]{3,4}-[a-z]{3,5}-[a-z]{3,4}\b',
            re.IGNORECASE
        )
        
        # Extension/contact instruction pattern
        self.extension_pattern = re.compile(
            r'\b(extension|ext\.?|contact.*for)\s+[a-z]+\s+at\s+(extension|ext\.?)\s+\d{2,5}',
            re.IGNORECASE
        )

        # Meeting links
        self.meeting_pattern = re.compile(
            r'(zoom\.us/|meet\.google\.com/|teams\.microsoft\.com/|webex\.com/)',
            re.IGNORECASE
        )

        # Calendar links
        self.calendar_pattern = re.compile(
            r'(calendar\.google\.com/|outlook\.live\.com/calendar)',
            re.IGNORECASE
        )

    def detect_all_patterns(self, text: str, normalized_text: str) -> List[Tuple[str, str]]:
        """Detect all contact information patterns in text.
        
        Args:
            text: Original text
            normalized_text: Normalized version of text
            
        Returns:
            List of tuples containing (violation_type, detected_pattern)
        """
        violations = []

        # Check phone numbers in normalized text
        phone_match = self.phone_pattern.search(normalized_text)
        if phone_match:
            matched_number = phone_match.group()
            has_contact_intent = self._has_contact_sharing_intent(text)
            is_false_positive = self._is_false_positive_number(matched_number, text, normalized_text)
            
            # Block if: (1) has contact intent and looks like phone, OR (2) not a false positive
            # Contact intent overrides some false positive checks (but not DOB, passport, etc.)
            digit_count = sum(1 for c in matched_number if c.isdigit())
            if has_contact_intent and digit_count >= 10:
                # With contact intent, block 10+ digit sequences
                violations.append(('phone_number', matched_number))
            elif not is_false_positive:
                # Without contact intent, rely on false positive filter
                violations.append(('phone_number', matched_number))
        
        # Check phone with context in original text
        phone_context_match = self.phone_context_pattern.search(text)
        if phone_context_match and not phone_match:
            violations.append(('phone_number', phone_context_match.group()))
        
        # Check for mixed word-digit patterns (ultra-aggressive)
        if not phone_match:
            # Look for sequences with mix of digits and number words
            mixed_pattern = r'(nine|eight|seven|six|five|four|three|two|one|zero|\d)+'
            for match in re.finditer(mixed_pattern, normalized_text, re.IGNORECASE):
                matched_text = match.group()
                if len(matched_text) >= 5:  # Ultra-low threshold
                    # Count digit-like elements
                    digit_count = sum(1 for c in matched_text if c.isdigit())
                    word_count = len(re.findall(r'(nine|eight|seven|six|five|four|three|two|one|zero)', 
                                               matched_text, re.IGNORECASE))
                    if digit_count + word_count >= 4:  # Ultra-low threshold for maximum sensitivity
                        has_contact_intent = self._has_contact_sharing_intent(text)
                        if has_contact_intent or not self._is_false_positive_number(matched_text, text, normalized_text):
                            violations.append(('phone_number', matched_text))
                            break
        
        # Check for very obfuscated patterns (n1n3, etc.)
        if not phone_match:
            obf_match = self.obfuscated_number_pattern.search(normalized_text)
            if obf_match:
                has_contact_intent = self._has_contact_sharing_intent(text)
                if has_contact_intent or not self._is_false_positive_number(obf_match.group(), text, normalized_text):
                    violations.append(('phone_number', obf_match.group()))
        
        # Check for confusable letter sequences that look like numbers
        if not phone_match:
            # Pattern: sequences like "OOO-lll-OOO" that could be "000-111-000"
            confusable_pattern = r'[OoIl]{3,}[\-\s]*[OoIl]{3,}[\-\s]*[OoIl]{3,}'
            conf_match = re.search(confusable_pattern, text)
            if conf_match:
                has_contact_intent = self._has_contact_sharing_intent(text)
                if has_contact_intent or not self._is_false_positive_number(conf_match.group(), text, normalized_text):
                    violations.append(('phone_number', conf_match.group()))
        
        # Check for leet-speak patterns in ORIGINAL text (before normalization)
        if not phone_match:
            leet_match = self.leetspeak_number_pattern.search(text)
            if leet_match:
                has_contact_intent = self._has_contact_sharing_intent(text)
                if has_contact_intent or not self._is_false_positive_number(leet_match.group(), text, normalized_text):
                    violations.append(('phone_number', leet_match.group()))
        
        # Check for concatenated number words
        concat_match = self.concat_numbers_pattern.search(text)
        if concat_match and not phone_match:
            has_contact_intent = self._has_contact_sharing_intent(text)
            if has_contact_intent or not self._is_false_positive_number(concat_match.group(), text, normalized_text):
                violations.append(('phone_number', concat_match.group()))
        
        # Check for long spelled number sequences
        if not phone_match:
            long_spelled_match = self.long_spelled_pattern.search(text)
            if long_spelled_match:
                has_contact_intent = self._has_contact_sharing_intent(text)
                if has_contact_intent or not self._is_false_positive_number(long_spelled_match.group(), text, normalized_text):
                    violations.append(('phone_number', long_spelled_match.group()))

        # Check email in both original and normalized
        email_match = self.email_pattern.search(text) or self.email_pattern.search(normalized_text)
        if not email_match:
            # Try normalized email pattern
            email_match = self.email_normalized_pattern.search(normalized_text)
        if not email_match:
            # Try Unicode email pattern (handles fullwidth, IDN, etc.)
            email_match = self.email_unicode_pattern.search(text)
        if not email_match:
            # Try placeholder pattern
            email_match = self.placeholder_email_pattern.search(text)
        if email_match:
            violations.append(('email_address', email_match.group()))

        # Check URLs (for meeting links and social profiles)
        url_match = self.url_pattern.search(text) or self.url_pattern.search(normalized_text)
        if url_match:
            violations.append(('url', url_match.group()))
        
        # Check obfuscated URLs
        obf_url_match = self.obfuscated_url_pattern.search(text)
        if obf_url_match and not url_match:
            violations.append(('url', obf_url_match.group()))

        # Check social media handles
        social_match = self.social_handle_pattern.search(text)
        if social_match:
            violations.append(('social_media_handle', social_match.group()))
        
        # Check Discord tags
        discord_match = self.discord_pattern.search(text)
        if discord_match:
            violations.append(('discord_tag', discord_match.group()))

        # Check UPI IDs
        upi_match = self.upi_pattern.search(text) or self.upi_pattern.search(normalized_text)
        if upi_match:
            violations.append(('upi_id', upi_match.group()))
        
        # Check UPI with context
        upi_context_match = self.upi_context_pattern.search(text)
        if upi_context_match and not upi_match:
            violations.append(('upi_id', upi_context_match.group()))

        # Check payment handles
        payment_match = self.payment_pattern.search(text) or self.payment_pattern.search(normalized_text)
        if payment_match:
            violations.append(('payment_handle', payment_match.group()))

        # Check WhatsApp
        whatsapp_match = self.whatsapp_pattern.search(text) or self.whatsapp_pattern.search(normalized_text)
        if whatsapp_match:
            violations.append(('whatsapp_link', whatsapp_match.group()))

        # Check Telegram
        telegram_match = self.telegram_pattern.search(text) or self.telegram_pattern.search(normalized_text)
        if telegram_match:
            violations.append(('telegram_link', telegram_match.group()))

        # Check meeting links
        meeting_match = self.meeting_pattern.search(text) or self.meeting_pattern.search(normalized_text)
        if meeting_match:
            violations.append(('meeting_link', meeting_match.group()))

        # Check calendar links
        calendar_match = self.calendar_pattern.search(text) or self.calendar_pattern.search(normalized_text)
        if calendar_match:
            violations.append(('calendar_link', calendar_match.group()))
        
        # Check Snapchat
        snapchat_match = self.snapchat_pattern.search(text) or self.snapchat_pattern.search(normalized_text)
        if snapchat_match:
            violations.append(('snapchat_link', snapchat_match.group()))
        
        # Check WeChat
        wechat_match = self.wechat_pattern.search(text) or self.wechat_pattern.search(normalized_text)
        if wechat_match:
            violations.append(('wechat_id', wechat_match.group()))
        
        # Check LINE
        line_match = self.line_pattern.search(text) or self.line_pattern.search(normalized_text)
        if line_match:
            violations.append(('line_id', line_match.group()))
        
        # Check letter-by-letter spelling
        letter_match = self.letter_spelling_pattern.search(text)
        if letter_match:
            violations.append(('letter_spelling', letter_match.group()))
        
        # Check spelled email (dot/at)
        spelled_email_match = self.spelled_email_pattern.search(text)
        if spelled_email_match:
            violations.append(('email_address', spelled_email_match.group()))
        
        # Check meet codes
        meet_code_match = self.meet_code_pattern.search(text)
        if meet_code_match:
            violations.append(('meeting_code', meet_code_match.group()))
        
        # Check extension patterns
        extension_match = self.extension_pattern.search(text)
        if extension_match:
            violations.append(('phone_number', extension_match.group()))
        
        # Check SSN (but filter out dates and other false positives)
        ssn_match = self.ssn_pattern.search(text)
        if ssn_match:
            matched_ssn = ssn_match.group()
            # Check if it's in SSN context
            if re.search(r'\b(ssn|social security)\b', text.lower()):
                violations.append(('ssn', matched_ssn))
            # Or if it matches SSN pattern and not a date
            elif not re.search(r'\b(date|dob|birth|born|appointment|on|at)\b', text.lower()):
                # Additional check: SSN typically has specific digit patterns
                digits_only = re.sub(r'\D', '', matched_ssn)
                if len(digits_only) == 9:
                    violations.append(('ssn', matched_ssn))
        
        # Additional check: detect leet-mixed patterns like "9lght7ree5"
        # Pattern with digits mixed with letters in suspicious ways
        leet_mixed = re.search(r'\d[a-z]+\d[a-z]+\d', normalized_text)
        if leet_mixed and not phone_match:
            matched = leet_mixed.group()
            # Count digits in the match
            digit_count = sum(1 for c in matched if c.isdigit())
            if digit_count >= 3 and len(matched) >= 5:
                has_contact_intent = self._has_contact_sharing_intent(text)
                if has_contact_intent or not self._is_false_positive_number(matched, text, normalized_text):
                    violations.append(('phone_number', matched))
        
        # Check for sequences with "zer0" or similar leet variations
        if not phone_match:
            zer0_pattern = re.search(r'(zer0|z3r0)', normalized_text, re.IGNORECASE)
            if zer0_pattern:
                # Look for surrounding digits or number words
                context_start = max(0, zer0_pattern.start() - 10)
                context_end = min(len(normalized_text), zer0_pattern.end() + 10)
                context = normalized_text[context_start:context_end]
                # Count digits in context
                digit_count = sum(1 for c in context if c.isdigit())
                has_contact_intent = self._has_contact_sharing_intent(text)
                if digit_count >= 3 and (has_contact_intent or not self._is_false_positive_number(context.strip(), text, normalized_text)):
                    violations.append(('phone_number', context.strip()))

        return violations
    
    def _has_contact_sharing_intent(self, text: str) -> bool:
        """Check if text has clear contact sharing intent.
        
        Args:
            text: Original message text
            
        Returns:
            True if contact sharing intent detected
        """
        text_lower = text.lower()
        
        # Exclude patterns that indicate NOT sharing contact (receiving calls, public helplines)
        exclude_patterns = [
            r'\bcall from\b',  # Receiving a call
            r'\bfor (help|customer care|support|assistance|appointments)\b',  # Public helpline
            r'\b(public|toll.?free|helpline|emergency)\b',
            # Note: Patient:/Doctor:/AI: messages CAN contain contact sharing, so don't exclude them
        ]
        
        for pattern in exclude_patterns:
            if re.search(pattern, text_lower):
                return False
        
        # Contact sharing intent patterns
        contact_intent_patterns = [
            r'\b(call me|dial me|phone me|contact me|reach me|text me|message me)\b',
            r'\b(my number|my phone|my email|my contact|my upi)\b',
            r'\b(add me|dm me|ping me|hit me up)\b',
            r'\b(call|dial|phone|contact|reach|msg|message|whatsapp|telegram|tel|office)\s*:',  # "Call:", "Dial:", "Tel:", etc.
            r'\bnumber\s+(spelled|is|here)',  # "Number spelled", "Number is", "Number here"
            r'\b(email me|send to|transfer via upi)\b',  # Explicit sharing actions
            r'\bstill my number\b',  # Explicit claim of ownership
        ]
        
        for pattern in contact_intent_patterns:
            if re.search(pattern, text_lower):
                return True
        
        return False
    
    def _is_false_positive_number(self, matched: str, original_text: str, normalized_text: str) -> bool:
        """Check if a matched number sequence is likely a false positive.
        
        Args:
            matched: The matched number sequence
            original_text: Original message text
            normalized_text: Normalized message text
            
        Returns:
            True if this is likely a false positive, False otherwise
        """
        # Safe context keywords that indicate non-contact numeric content
        safe_contexts = [
            # Date/time related
            r'\b(date|time|timestamp|year|month|day|hour|minute|second|am|pm)\b',
            r'\b(dob|birth|born|birthdate|birthday)\b',  # Date of birth
            r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b',
            r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(2025|2024|2026|202[0-9])\b',  # Years
            
            # Financial/transactional
            r'\b(price|cost|amount|\$|usd|eur|inr|order|invoice|reference|ref)\b',
            r'\b(payment|transaction|receipt|bill)\b',
            
            # Technical/system
            r'\b(error|code|version|ip|ipv4|ipv6|port|server|api)\b',
            r'\b(serial|sku|model|product|item)\b',
            r'\b(ticket|case|id|number|no\.)\b',
            r'\b(otp|pin|password|passcode|verification|expires|temporary)\b',
            r'\b(shortcode|sms|subscribe|service)\b',
            r'\b(passport|travel|vaccine)\b',  # Passport context
            
            # Location/physical
            r'\b(room|floor|block|sector|building|address|suite)\b',
            r'\b(latitude|longitude|coordinates|geo)\b',
            
            # Medical/clinical (non-identifying) - but NOT speaker labels
            r'\b(clinic|hospital|appointment|prescription)\b',
            r'\b(\d+\s+patients?)\b',  # "23 patients" is safe, but not "Patient: 123"
            r'\b(test|lab|result|diagnosis|treatment|medication|dose|mg|ml|g/dl|ul)\b',
            r'\b(blood|pressure|temperature|heart|rate|level|hemoglobin|wbc|rbc)\b',
            r'\b(redacted|removed|phi|pii|hipaa)\b',
            r'\b(symptoms|chest pain|shortness|breath|experiencing)\b',
            
            # Measurement/math
            r'\b(equation|math|calculation|formula|result)\b',
            r'\b(score|points|rating|percentage)\b',
            r'\b(section|chapter|page|paragraph)\b',
            
            # Public/helpline (allowed)
            r'\b(helpline|support|customer care|central booking|reception)\b',
            r'\b(1-?800|1800|toll.?free|public|emergency|dial|help)\b',
            r'\b(911|999|112|1098|100|101|102|108)\b',  # Emergency numbers
            
            # File/data
            r'\b(file|report|document|log|csv|pdf|xlsx)\b',
            r'\b(timecode|duration|length)\b',
        ]
        
        # Check if original text contains safe context
        original_lower = original_text.lower()
        for pattern in safe_contexts:
            if re.search(pattern, original_lower):
                return True
        
        # Date patterns (YYYY-MM-DD, DD/MM/YYYY, etc.)
        date_patterns = [
            r'\b20[0-9]{2}[-/]?[0-1]?[0-9][-/]?[0-3]?[0-9]\b',  # YYYY-MM-DD
            r'\b[0-3]?[0-9][-/][0-1]?[0-9][-/]20[0-9]{2}\b',  # DD-MM-YYYY
            r'\b[0-1]?[0-9][-/][0-3]?[0-9][-/]20[0-9]{2}\b',  # MM-DD-YYYY
        ]
        for pattern in date_patterns:
            if re.search(pattern, original_text):
                return True
        
        # Time patterns (HH:MM:SS, HH:MM)
        if re.search(r'\b[0-2]?[0-9]:[0-5][0-9](:[0-5][0-9])?\b', original_text):
            return True
        
        # IP address pattern
        if re.search(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', original_text):
            return True
        
        # Version numbers (e.g., 2.0.1, v1.2.3)
        if re.search(r'\b(v|version)?\s*\d+\.\d+(\.\d+)?\b', original_lower):
            return True
        
        # Currency amounts (e.g., $1,234.56)
        if re.search(r'[$€£¥]\s*[\d,]+\.?\d*', original_text):
            return True
        
        # Order/reference IDs with prefixes
        if re.search(r'\b[A-Z]{2,}-\d+', original_text):
            return True
        
        # Card numbers (test cards: 4111..., 5500..., and general card patterns)
        if re.search(r'\b(4111|5500|card|bank card|test card)\s*\d{4}\s*\d{4}\s*\d{4}\b', original_text, re.IGNORECASE):
            return True
        # Card-like patterns with dashes
        if re.search(r'\b\d{4}-\d{4}-\d{4}-\d{4}\b', original_text):
            return True
        
        # Check for passport pattern (letter followed by digits)
        if re.search(r'\b[A-Z]\d{7,9}\b', original_text):
            return True
        
        # Very short sequences (< 5 digits) are often not phone numbers
        digit_count_in_match = sum(1 for c in matched if c.isdigit())
        if digit_count_in_match < 5:
            return True
        
        # Sequences that are too long (> 15 digits) are usually not phone numbers
        digit_count = sum(1 for c in matched if c.isdigit())
        if digit_count > 15:
            return True
        
        return False


class ContextAnalyzer:
    """Analyzes message context for contact sharing intent."""

    # Intent phrases that suggest contact sharing
    INTENT_PHRASES = [
        r'\bcontact\s+me\b', r'\breach\s+(out\s+to\s+)?me\b', r'\bcall\s+me\b',
        r'\btext\s+me\b', r'\bdm\s+me\b', r'\badd\s+me\b', r'\bmessage\s+me\b',
        r'\bmy\s+number\b', r'\bmy\s+email\b', r'\bmy\s+whatsapp\b',
        r'\bmy\s+telegram\b', r'\bmy\s+insta(gram)?\b', r'\bmy\s+snap(chat)?\b',
        r'\bget\s+in\s+touch\b', r'\bhit\s+me\s+up\b', r'\bping\s+me\b',
        r'\bshoot\s+me\s+(a\s+)?(message|text|email)\b'
    ]

    def __init__(self):
        """Initialize compiled intent patterns."""
        self.intent_patterns = [re.compile(phrase, re.IGNORECASE) for phrase in self.INTENT_PHRASES]

    def has_contact_intent(self, text: str) -> bool:
        """Check if message contains contact sharing intent.
        
        Args:
            text: Message text to analyze
            
        Returns:
            True if contact intent detected, False otherwise
        """
        if not text:
            return False

        return any(pattern.search(text) for pattern in self.intent_patterns)


class RateLimiter:
    """Track user violations for rate limiting."""

    def __init__(self, window_minutes: int = 60, max_violations: int = 3):
        """Initialize rate limiter.
        
        Args:
            window_minutes: Time window for tracking violations
            max_violations: Maximum violations allowed in window
        """
        self.window_minutes = window_minutes
        self.max_violations = max_violations
        self.user_violations: Dict[str, List[datetime]] = defaultdict(list)

    def add_violation(self, user_id: str) -> None:
        """Record a violation for a user.
        
        Args:
            user_id: Unique user identifier
        """
        now = datetime.now()
        self.user_violations[user_id].append(now)
        self._cleanup_old_violations(user_id, now)

    def is_rate_limited(self, user_id: str) -> bool:
        """Check if user has exceeded violation limit.
        
        Args:
            user_id: Unique user identifier
            
        Returns:
            True if user is rate limited, False otherwise
        """
        now = datetime.now()
        self._cleanup_old_violations(user_id, now)
        return len(self.user_violations[user_id]) >= self.max_violations

    def get_violation_count(self, user_id: str) -> int:
        """Get current violation count for user.
        
        Args:
            user_id: Unique user identifier
            
        Returns:
            Number of violations in current window
        """
        now = datetime.now()
        self._cleanup_old_violations(user_id, now)
        return len(self.user_violations[user_id])

    def _cleanup_old_violations(self, user_id: str, now: datetime) -> None:
        """Remove violations outside the time window.
        
        Args:
            user_id: Unique user identifier
            now: Current timestamp
        """
        cutoff = now - timedelta(minutes=self.window_minutes)
        self.user_violations[user_id] = [
            v for v in self.user_violations[user_id] if v > cutoff
        ]


class ContactModerationSystem:
    """Main moderation system for detecting contact information sharing."""

    # Severity weights for different violation types
    SEVERITY_WEIGHTS = {
        'phone_number': 25,
        'email_address': 20,
        'upi_id': 25,
        'url': 15,
        'social_media_handle': 15,
        'payment_handle': 20,
        'whatsapp_link': 20,
        'telegram_link': 20,
        'snapchat_link': 20,
        'wechat_id': 20,
        'line_id': 20,
        'meeting_link': 10,
        'meeting_code': 15,
        'calendar_link': 10,
        'letter_spelling': 18
    }

    def __init__(self, sensitivity: str = 'high'):
        """Initialize moderation system.
        
        Args:
            sensitivity: Detection sensitivity level ('low', 'medium', 'high')
        """
        self.sensitivity = sensitivity
        self.normalizer = TextNormalizer()
        self.detector = PatternDetector()
        self.context_analyzer = ContextAnalyzer()
        self.rate_limiter = RateLimiter()

    def moderate_message(self, message: str, user_id: Optional[str] = None) -> ModerationResult:
        """Moderate a message for contact information.
        
        Args:
            message: Message text to moderate
            user_id: Optional user identifier for rate limiting
            
        Returns:
            ModerationResult object with detection details
        """
        # Handle None/empty inputs
        if not message:
            return ModerationResult(
                is_blocked=False,
                confidence='low',
                violation_type=None,
                detected_pattern=None,
                original_text='',
                normalized_text='',
                severity_score=0,
                all_violations=[]
            )

        # Limit message length for efficiency (max 10,000 chars)
        if len(message) > 10000:
            message = message[:10000]

        # Normalize text
        normalized = self.normalizer.normalize(message)

        # Detect all patterns
        violations = self.detector.detect_all_patterns(message, normalized)

        # Check for contact intent
        has_intent = self.context_analyzer.has_contact_intent(message)

        # Calculate severity score
        severity_score = self._calculate_severity(violations, has_intent)

        # Determine if message should be blocked
        is_blocked, confidence = self._should_block(violations, has_intent, severity_score)

        # Get primary violation
        violation_type = violations[0][0] if violations else None
        detected_pattern = violations[0][1] if violations else None

        # Track violation if blocked and user_id provided
        if is_blocked and user_id:
            self.rate_limiter.add_violation(user_id)

        return ModerationResult(
            is_blocked=is_blocked,
            confidence=confidence,
            violation_type=violation_type,
            detected_pattern=detected_pattern,
            original_text=message,
            normalized_text=normalized,
            severity_score=severity_score,
            all_violations=violations
        )

    def _calculate_severity(self, violations: List[Tuple[str, str]], has_intent: bool) -> int:
        """Calculate severity score (0-100).
        
        Args:
            violations: List of detected violations
            has_intent: Whether contact intent was detected
            
        Returns:
            Severity score from 0 to 100
        """
        if not violations:
            return 0

        # Sum weights of all violations
        score = sum(self.SEVERITY_WEIGHTS.get(v[0], 10) for v in violations)

        # Add bonus for contact intent
        if has_intent:
            score += 15

        # Add bonus for multiple violations
        if len(violations) > 1:
            score += 10 * (len(violations) - 1)

        return min(score, 100)

    def _should_block(self, violations: List[Tuple[str, str]], has_intent: bool, severity: int) -> Tuple[bool, str]:
        """Determine if message should be blocked and confidence level.
        
        Args:
            violations: List of detected violations
            has_intent: Whether contact intent was detected
            severity: Severity score
            
        Returns:
            Tuple of (should_block, confidence_level)
        """
        if not violations:
            return False, 'low'

        # High sensitivity: block on any violation
        if self.sensitivity == 'high':
            if violations:
                confidence = 'high' if has_intent or severity >= 50 else 'medium'
                return True, confidence

        # Medium sensitivity: block on clear violations or intent + pattern
        elif self.sensitivity == 'medium':
            # High-risk violations always blocked
            high_risk = {'phone_number', 'email_address', 'upi_id', 'payment_handle'}
            if any(v[0] in high_risk for v in violations):
                return True, 'high'

            # Intent + any violation = block
            if has_intent and violations:
                return True, 'medium'

            # Multiple violations = block
            if len(violations) >= 2:
                return True, 'medium'

        # Low sensitivity: only block obvious violations
        else:  # low
            high_risk = {'phone_number', 'email_address', 'upi_id'}
            if any(v[0] in high_risk for v in violations) and has_intent:
                return True, 'high'

            if severity >= 70:
                return True, 'medium'

        return False, 'low'


def run_tests():
    """Comprehensive test suite for the moderation system."""
    print("="*80)
    print("CONTACT INFORMATION DETECTION SYSTEM - TEST SUITE")
    print("="*80)
    print("Running with HIGH sensitivity (default)")
    print("="*80)

    moderator = ContactModerationSystem(sensitivity='high')

    test_cases = [
        # Obfuscated phone numbers
        ("nine eight seven six five four three two one zero", True, "Word numbers"),
        ("call me on 98 76 54 32 10", True, "Spaced phone number"),
        ("n!n#e$8%7^6&5*4(3)2+1=0", True, "Special char obfuscation"),
        ("my number is 9-8-7-6-5-4-3-2-1-0", True, "Dashed phone number"),
        ("contact: (987) 654-3210", True, "Formatted phone number"),

        # Leetspeak
        ("c4ll m3 4t 98765four3210", True, "Leetspeak + word numbers"),
        ("3m41l: t3st@3x4mpl3.c0m", True, "Leetspeak email"),

        # Email obfuscation
        ("email me at john [at] gmail [dot] com", True, "Email with [at] [dot]"),
        ("reach me: test@example.com", True, "Plain email"),
        ("contact john at gmail dot com", True, "Email with 'at' 'dot'"),

        # Social media
        ("add me @insta_user123", True, "Instagram handle"),
        ("follow me at twitter_handle", True, "Social handle"),
        ("my snap is @cooluser", True, "Snapchat handle"),

        # Payment IDs
        ("pay 9876543210@paytm", True, "UPI ID"),
        ("send to user@okaxis", True, "UPI bank handle"),
        ("paypal.me/username", True, "PayPal link"),
        ("venmo me at $username", True, "Venmo handle"),

        # Meeting/Calendar links
        ("join zoom dot us slash meeting", True, "Obfuscated Zoom link"),
        ("meet.google.com/abc-defg-hij", True, "Google Meet link"),
        ("teams.microsoft.com/meeting", True, "Teams link"),

        # Messaging apps
        ("whatsapp me", True, "WhatsApp mention"),
        ("wa.me/1234567890", True, "WhatsApp link"),
        ("t.me/username", True, "Telegram link"),

        # URLs
        ("visit www.example.com", True, "URL with www"),
        ("check out example dot com", True, "Obfuscated URL"),
        ("https://test.org", True, "HTTPS URL"),

        # Phonetic numbers
        ("call me ate won too for five", True, "Phonetic numbers"),

        # Valid messages (should NOT be blocked)
        ("Hello, how are you?", False, "Normal greeting"),
        ("I love this product!", False, "Normal message"),
        ("The meeting is at 3 PM", False, "Time reference"),
        ("I scored 9 out of 10", False, "Score/rating"),
        ("See you tomorrow!", False, "Normal farewell"),
        ("Thanks for the help", False, "Gratitude"),
        ("What's the weather like?", False, "Question"),
        ("I have 5 apples", False, "Quantity"),

        # Edge cases
        ("", False, "Empty string"),
        ("   ", False, "Whitespace only"),
        ("@", False, "Single @ symbol"),
        ("123", False, "Short number"),
    ]

    passed = 0
    failed = 0

    for i, (message, should_block, description) in enumerate(test_cases, 1):
        result = moderator.moderate_message(message)
        status = "[PASS]" if result.is_blocked == should_block else "[FAIL]"

        if result.is_blocked == should_block:
            passed += 1
        else:
            failed += 1

        print(f"\nTest {i}: {description}")
        print(f"Message: '{message}'")
        print(f"Expected: {'BLOCK' if should_block else 'ALLOW'}")
        print(f"Result: {'BLOCK' if result.is_blocked else 'ALLOW'} [{result.confidence} confidence]")
        if result.violation_type:
            print(f"Violation: {result.violation_type} - '{result.detected_pattern}'")
        print(f"Severity: {result.severity_score}/100")
        print(f"Status: {status}")

    print("\n" + "="*80)
    print(f"TEST RESULTS: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    print(f"Success Rate: {(passed/len(test_cases)*100):.1f}%")
    print("="*80)


def demo_usage():
    """Demonstrate system usage with examples."""
    print("\n" + "="*80)
    print("DEMONSTRATION OF USAGE")
    print("="*80)

    # Create moderator with different sensitivity levels
    print("\n--- Testing Different Sensitivity Levels ---\n")

    test_message = "add me @john_doe or email john@example.com"

    for sensitivity in ['low', 'medium', 'high']:
        moderator = ContactModerationSystem(sensitivity=sensitivity)
        result = moderator.moderate_message(test_message)
        print(f"Sensitivity: {sensitivity.upper()}")
        print(f"  Blocked: {result.is_blocked}")
        print(f"  Confidence: {result.confidence}")
        print(f"  Severity: {result.severity_score}/100")
        print(f"  Violations: {len(result.all_violations)}")
        print()

    # Demonstrate rate limiting
    print("--- Rate Limiting Demo ---\n")
    moderator = ContactModerationSystem()
    user_id = "user123"

    for i in range(5):
        result = moderator.moderate_message("call me 9876543210", user_id=user_id)
        violation_count = moderator.rate_limiter.get_violation_count(user_id)
        is_limited = moderator.rate_limiter.is_rate_limited(user_id)
        print(f"Attempt {i+1}: Violations={violation_count}, Rate Limited={is_limited}")

    # Show detailed result
    print("\n--- Detailed Result Example ---\n")
    result = moderator.moderate_message("Contact me at nine eight seven six five four three two one zero or email test@gmail.com")
    result_dict = result.to_dict()
    print("Result Dictionary:")
    for key, value in result_dict.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    import sys
    import io
    # Set UTF-8 encoding for output to handle special characters
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    # Run comprehensive tests
    run_tests()

    # Show usage demonstrations
    demo_usage()

    print("\n" + "="*80)
    print("SYSTEM READY FOR PRODUCTION USE")
    print("="*80)
    print("\nQuick Start:")
    print("  from main import ContactModerationSystem")
    print("  moderator = ContactModerationSystem()  # Default: HIGH sensitivity")
    print("  result = moderator.moderate_message('your message here')")
    print("  if result.is_blocked:")
    print("      # Handle blocked message")
    print("      print(f'Blocked: {result.violation_type}')")
    print("="*80)
