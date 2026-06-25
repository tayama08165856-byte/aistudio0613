rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default catch-all denies all access
    match /{document=**} {
      allow read, write: if false;
    }

    // Rules for Education items
    match /educationItems/{itemId} {
      allow read, write: if true;
    }

    // Rules for Custom Categories
    match /categories/{categoryId} {
      allow read, write: if true;
    }
  }
}
