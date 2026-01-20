#!/usr/bin/env python3
import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_users():
    # Path to the service account key
    creds_path = 'scripts/arcascend-app-firebase-adminsdk-fbsvc-4550cc723a.json'
    
    if not os.path.exists(creds_path):
        print(f"❌ Service account key not found at {creds_path}")
        return

    # Initialize Firebase Admin
    cred = credentials.Certificate(creds_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    print('\n👥 Fetching users from Firestore...\n')
    
    try:
        users_ref = db.collection('users')
        users = users_ref.get()
        
        if not users:
            print('No users found.')
            return

        print(f"Found {len(users)} users:")
        print('-' * 70)
        print(f"{'ID':<30} | {'Name':<20} | {'Rank':<12} | {'XP'}")
        print('-' * 70)

        for doc in users:
            data = doc.to_dict()
            user_id = doc.id
            name = data.get('name', 'N/A')
            xp_data = data.get('xp', {})
            total_xp = xp_data.get('totalXp', 0)
            rank = xp_data.get('rank', 'N/A')
            
            print(f"{user_id:<30} | {name:<20} | {rank:<12} | {total_xp}")
        
        print('-' * 70)
        
    except Exception as e:
        print(f"❌ Error fetching users: {e}")

if __name__ == "__main__":
    list_users()
