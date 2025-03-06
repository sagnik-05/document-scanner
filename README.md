# Document Scanner

Welcome to the Document Scanner project! This project aims to provide a simple and efficient way to scan documents using your device's camera.

## Features

### User Management
- User registration and authentication
- Role-based access control (Admin/User)
- Secure password hashing
- JWT-based authentication

### Document Management
- Upload documents (PDF, TXT)
- View uploaded documents
- Delete documents
- Document comparison and matching
- File type validation
- Secure storage

### Credit System
- 20 free scans per day (auto-reset at midnight)
- Credit request system
- Admin approval for credit requests
- Credit usage tracking
- Credit history

### Analytics Dashboard
- Document statistics
- Usage metrics
- Credit tracking
- Activity history
- Document type distribution

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer
- **Frontend**: HTML, CSS, JavaScript (Vanilla)


## API Endpoints

### Authentication
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|-----------|
| POST | `/api/auth/register` | Register new user | ```json { "username": "string", "password": "string" }``` | ```json { "message": "User registered successfully", "userId": "number" }``` |
| POST | `/api/auth/login` | User login | ```json { "username": "string", "password": "string" }``` | ```json { "token": "string", "userId": "number", "username": "string" }``` |

### Documents
| Method | Endpoint | Description | Request Body/Params | Response |
|--------|----------|-------------|-------------------|-----------|
| POST | `/api/documents/upload` | Upload document | Form Data: `document` (file) | ```json { "message": "Document uploaded successfully", "documentId": "number", "filename": "string" }``` |
| GET | `/api/documents` | Get all documents | - | ```json { "documents": [{ "id": "number", "filename": "string", "upload_date": "date" }] }``` |
| GET | `/api/documents/:id` | Get specific document | Params: `id` | ```json { "document": { "id": "number", "filename": "string", "content": "string" } }``` |
| DELETE | `/api/documents/:id` | Delete document | Params: `id` | ```json { "message": "Document deleted successfully" }``` |

### Credits
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|-----------|
| GET | `/api/credits` | Get credit balance | - | ```json { "credits": "number" }``` |
| POST | `/api/credits/request` | Request additional credits | ```json { "amount": "number" }``` | ```json { "message": "Credit request submitted successfully", "requestId": "number" }``` |
| GET | `/api/credits/history` | Get credit history | - | ```json { "requests": [{ "id": "number", "amount": "number", "status": "string", "request_date": "date" }] }``` |

### Analytics
| Method | Endpoint | Description | Response |
|--------|----------|-------------|-----------|
| GET | `/api/analytics/user-stats` | Get user statistics | ```json { "stats": { "totalDocuments": "number", "totalScans": "number", "creditsUsed": "number", "activeDays": "number" }, "documentTypes": [{ "type": "string", "count": "number" }], "recentActivity": [{ "date": "date", "action": "string", "document": "string" }] }``` |

### Authentication Headers
All endpoints except `/auth/register` and `/auth/login` require the following header:
Authorization: Bearer <jwt_token>

## Installation

To install and run the project, follow these steps:

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/document-scanner.git
    ```
2. Navigate to the project directory:
    ```sh
    cd document-scanner
    ```
3. Install the required dependencies:
    ```sh
    npm install
    ```

## Usage

To start the application, run the following command:
```sh
npm start
or
npm run dev
```


## Contributing

We welcome contributions to the Document Scanner project! To contribute, follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature-branch`)
6. Open a pull request



## Contact

If you have any questions or suggestions, feel free to open an issue or contact the project maintainer at [your-email@example.com](mailto:your-email@example.com).

Thank you for using Document Scanner!