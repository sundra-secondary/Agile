# E-Pharmacist account data model

The full project concept includes accounts, care relationships, reminders, medical posts, pharmacist advice, and news. Sprint I implements only `USER`: patient and caregiver accounts share one MongoDB `users` collection, distinguished by `role`. The other entities below show planned relationships for later sprints.

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string firstName
        string lastName
        string email UK
        string role "patient or caregiver"
        string password "bcrypt hash"
        Date createdAt
        Date updatedAt
    }
    CARE_RELATIONSHIP {
        ObjectId _id PK
        ObjectId caregiverId FK
        ObjectId patientId FK
    }
    REMINDER {
        ObjectId _id PK
        ObjectId patientId FK
        string type
        string message
        Date dueAt
    }
    MEDICAL_POST {
        ObjectId _id PK
        ObjectId authorId FK
        string description
        Date createdAt
    }
    PHARMACIST_PROFILE {
        ObjectId _id PK
        ObjectId userId FK
        string licenseNumber
        string approvalStatus
    }
    ADVICE {
        ObjectId _id PK
        ObjectId postId FK
        ObjectId pharmacistId FK
        string response
    }
    NEWS_ARTICLE {
        ObjectId _id PK
        ObjectId authorId FK
        string title
        string category
        string status
    }
    USER ||--o{ CARE_RELATIONSHIP : caregiver
    USER ||--o{ CARE_RELATIONSHIP : patient
    USER ||--o{ REMINDER : receives
    USER ||--o{ MEDICAL_POST : writes
    USER ||--o| PHARMACIST_PROFILE : has
    MEDICAL_POST ||--o{ ADVICE : receives
    PHARMACIST_PROFILE ||--o{ ADVICE : writes
    USER ||--o{ NEWS_ARTICLE : authors
```

| Field | Rule |
| --- | --- |
| `_id` | MongoDB document ID |
| `firstName`, `lastName` | Required, trimmed, 60 characters maximum |
| `email` | Required, normalized to lowercase, validated, unique index |
| `role` | Required; `patient` or `caregiver` |
| `password` | Required, minimum 8 characters before hashing; stored as a salted bcrypt hash and excluded from default queries |
| `createdAt`, `updatedAt` | Managed by Mongoose timestamps |

The `USER` schema is implemented in [`models/userModel.js`](../models/userModel.js). The remaining entities are a design proposal only and can change as later backlog items are refined. A single account collection avoids duplicating shared fields; role-specific records can reference `users._id` when those features are developed.
