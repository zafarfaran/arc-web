#!/usr/bin/env python3
"""
Seed Script - Generate Dummy Users for Testing (Python version)
Usage: python3 seed_dummy_users.py --creds path/to/service-account.json --count 15 --lat 53.48 --lng -2.24
"""

import argparse
import random
import uuid
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
from faker import Faker
import math
import base64

# ========================================
# CONFIGURATION & CONSTANTS
# ========================================

RANKS = ['novice', 'apprentice', 'achiever', 'champion', 'master', 'legend']
RANK_THRESHOLDS = {
    'novice': 0,
    'apprentice': 500,
    'achiever': 2000,
    'champion': 5000,
    'master': 15000,
    'legend': 50000
}

HABIT_NAMES = [
    'Morning meditation', 'Exercise', 'Read 30 mins', 'Drink 8 glasses water',
    'No social media before noon', 'Journal', 'Cold shower', 'Walk 10k steps',
    'Practice language', 'Learn something new', 'Gratitude practice', 'Stretch',
]

TODO_TEMPLATES = [
    'Review project docs', 'Send weekly update', 'Call client', 'Update portfolio',
    'Prepare presentation', 'Research competitors', 'Fix bug #123', 'Write tests',
    'Review PR', 'Update documentation', 'Team standup notes', 'Plan sprint',
]

GOAL_TEMPLATES = [
    {'title': 'Read 24 books this year', 'target': 24, 'unit': 'books'},
    {'title': 'Run 500 miles', 'target': 500, 'unit': 'miles'},
    {'title': 'Save $10,000', 'target': 10000, 'unit': 'dollars'},
    {'title': 'Complete 100 workouts', 'target': 100, 'unit': 'workouts'},
    {'title': 'Learn Spanish', 'target': 365, 'unit': 'days practiced'},
    {'title': 'Write 50 blog posts', 'target': 50, 'unit': 'posts'},
    {'title': 'Meditate 200 hours', 'target': 200, 'unit': 'hours'},
]

# ========================================
# LOCATION PRIVACY HELPERS
# ========================================

import hashlib
import json
import base64
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

ENCRYPTION_KEY = 'arc-web-location-secret-key-12345'

def encrypt_location(data_obj):
    """
    Encrypts data to a format compatible with crypto-js.AES.encrypt(json, passphrase)
    Uses OpenSSL compatible key derivation (EVP_BytesToKey)
    """
    plaintext = json.dumps(data_obj).encode('utf-8')
    passphrase = ENCRYPTION_KEY.encode('utf-8')
    
    # Generate salt (8 bytes)
    salt = os.urandom(8)
    
    # Key derivation (EVP_BytesToKey)
    # Replicates crypto-js default behavior
    def openssl_kdf(passphrase, salt, key_len, iv_len):
        dtot = b""
        d = b""
        while len(dtot) < key_len + iv_len:
            d = hashlib.md5(d + passphrase + salt).digest()
            dtot += d
        return dtot[:key_len], dtot[key_len:key_len + iv_len]

    key, iv = openssl_kdf(passphrase, salt, 32, 16)
    
    # PKCS7 Padding
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plaintext) + padder.finalize()
    
    # AES-256-CBC Encryption
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    
    # Format: "Salted__" + 8-byte salt + ciphertext
    result = b"Salted__" + salt + ciphertext
    return base64.b64encode(result).decode('utf-8')

def obfuscate_location(lat, lng):
    """
    Adds a ~5KM jitter to coordinates and encrypts them.
    Compatible with the web application's security layer.
    """
    jitter_km = 5
    deg_lat = jitter_km / 111.0
    deg_lng = jitter_km / (111.0 * math.cos(math.radians(lat)))

    delta_lat = (random.random() * 2 - 1) * deg_lat
    delta_lng = (random.random() * 2 - 1) * deg_lng

    jittered = {'lat': lat + delta_lat, 'lng': lng + delta_lng}
    return encrypt_location(jittered)

# ========================================
# DUMMY DATA GENERATORS
# ========================================

fake = Faker()

def calculate_rank(xp):
    if xp >= RANK_THRESHOLDS['legend']: return 'legend'
    if xp >= RANK_THRESHOLDS['master']: return 'master'
    if xp >= RANK_THRESHOLDS['champion']: return 'champion'
    if xp >= RANK_THRESHOLDS['achiever']: return 'achiever'
    if xp >= RANK_THRESHOLDS['apprentice']: return 'apprentice'
    return 'novice'

def generate_dummy_user(base_lat, base_lng, index):
    first_name = fake.first_name()
    last_name = fake.last_name()
    name = f"{first_name} {last_name}"
    user_id = f"dummy_{int(datetime.now().timestamp())}_{index}"
    
    # XP distribution - more lower ranks
    roll = random.random() * 100
    if roll < 30: xp_range = (50, 499)      # Novice
    elif roll < 55: xp_range = (500, 1999)    # Apprentice
    elif roll < 75: xp_range = (2000, 4999)   # Achiever
    elif roll < 90: xp_range = (5000, 14999)  # Champion
    elif roll < 98: xp_range = (15000, 49999) # Master
    else: xp_range = (50000, 70000)           # Legend
    
    total_xp = random.randint(*xp_range)
    rank = calculate_rank(total_xp)
    
    # Generate XP history
    xp_history = []
    sources = ['todo', 'habit', 'goal', 'milestone', 'session']
    for _ in range(10):
        xp_history.append({
            'id': str(uuid.uuid4()),
            'amount': random.randint(10, 40),
            'source': random.choice(sources),
            'description': f"Completed {random.choice(['task', 'habit', 'goal'])}",
            'timestamp': datetime.now() - timedelta(days=random.randint(0, 14))
        })
    
    # Location with offset (within ~30 miles of base)
    raw_lat = base_lat + (random.random() - 0.5) * 0.8
    raw_lng = base_lng + (random.random() - 0.5) * 0.8
    
    # Generate dummy goals
    goals = []
    for i in range(2):
        target = random.randint(50, 200)
        is_decreasing = random.random() > 0.5
        start = random.randint(target + 10, target + 100) if is_decreasing else random.randint(0, target - 10)
        current = random.randint(target, start) if is_decreasing else random.randint(start, target)
        
        goals.append({
            'id': str(uuid.uuid4()),
            'name': f"Dummy Goal {i+1}",
            'goalType': 'trackable',
            'startingValue': start,
            'targetValue': target,
            'currentValue': current,
            'targetDirection': 'decrease' if is_decreasing else 'increase',
            'unit': 'kg' if is_decreasing else 'points',
            'category': 'fitness' if is_decreasing else 'personal',
            'color': '#F87171' if is_decreasing else '#60A5FA',
            'createdAt': datetime.now() - timedelta(days=random.randint(0, 30)),
            'deadline': datetime.now() + timedelta(days=random.randint(30, 90))
        })
    
    return {
        'id': user_id,
        'name': name,
        'email': f"{first_name.lower()}.{last_name.lower()}{index}@example.com",
        'isPro': random.random() > 0.7,
        'isPublic': True,
        'location': obfuscate_location(raw_lat, raw_lng),
        'xp': {
            'totalXp': total_xp,
            'rank': rank,
            'xpHistory': xp_history
        },
        'goals': goals, # Add the generated goals here
        'createdAt': datetime.now()
    }

# ========================================
# MAIN SEED FUNCTION
# ========================================

def seed_data(creds_path, count, base_lat, base_lng):
    # Initialize Firebase Admin
    cred = credentials.Certificate(creds_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    print(f"\n🌱 Seeding {count} dummy users to project: {cred.project_id}\n")
    
    for i in range(count):
        user_data = generate_dummy_user(base_lat, base_lng, i)
        user_id = user_data.pop('id')
        
        try:
            # Save user document
            db.collection('users').document(user_id).set(user_data)
            print(f"✅ Created: {user_data['name']} ({user_data['xp']['rank']}) - {user_data['xp']['totalXp']} XP")
            
            # Additional related data (todos, habits, goals) can be added here if needed
            # For simplicity, we've bundled the key stats into the user doc for the leaderboard
            
        except Exception as e:
            print(f"❌ Failed to create {user_data['name']}: {e}")
            
    print(f"\n🎉 Done! Generated {count} users near {base_lat}, {base_lng}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Seed Firestore with dummy user data.')
    parser.add_argument('--creds', required=True, help='Path to service-account.json')
    parser.add_argument('--count', type=int, default=15, help='Number of users to generate')
    parser.add_argument('--lat', type=float, default=53.48, help='Base latitude for location generation')
    parser.add_argument('--lng', type=float, default=-2.24, help='Base longitude for location generation')
    
    args = parser.parse_args()
    
    seed_data(args.creds, args.count, args.lat, args.lng)
