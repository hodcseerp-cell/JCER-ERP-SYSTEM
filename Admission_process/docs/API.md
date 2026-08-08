# College ERP System - Complete API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except login, register, admission) require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

---

## 🔐 Authentication Endpoints

### 1. Login
**POST** `/auth/login`

**Request:**
```json
{
  "email": "student@college.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@college.com",
    "role": "STUDENT",
    "name": "John Doe",
    "profileImage": "https://s3.amazonaws.com/..."
  }
}
```

**Errors:**
- 400: Invalid request body
- 401: Invalid credentials
- 404: User not found

---

### 2. Register (Self Registration - Future)
**POST** `/auth/register`

**Request:**
```json
{
  "email": "newstudent@college.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "message": "Registration successful. Please wait for admin approval.",
  "userId": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

### 3. Logout
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 4. Refresh Token
**POST** `/auth/refresh-token`

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "token": "new_jwt_token_here"
}
```

---

## 📋 Admission Endpoints

### 5. Submit Admission Form
**POST** `/admission/submit`

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "dateOfBirth": "2005-01-15",
  "fatherName": "Mr. Doe",
  "motherName": "Mrs. Doe",
  "address": "123 Main St, City",
  "board": "CBSE",
  "percentage10th": 85.5,
  "percentage12th": 88.5,
  "appliedProgram": "Computer Science",
  "documents": {
    "marksheet10th": "url_to_file",
    "marksheet12th": "url_to_file",
    "aadhar": "url_to_file"
  }
}
```

**Response (201):**
```json
{
  "admissionId": "ADM-2024-001",
  "status": "PENDING",
  "submittedAt": "2024-01-15T10:30:00Z",
  "message": "Application submitted successfully. Validation will take 2-3 days."
}
```

---

### 6. Get Admission Status
**GET** `/admission/:admissionId`

**Response (200):**
```json
{
  "admissionId": "ADM-2024-001",
  "applicantName": "John Doe",
  "status": "VALIDATED",
  "validatedDate": "2024-01-17T14:20:00Z",
  "approvalPendingAt": "PRINCIPAL",
  "appliedProgram": "Computer Science",
  "marks": {
    "percentage10th": 85.5,
    "percentage12th": 88.5
  }
}
```

---

### 7. Validate Admission (Validator Only)
**PUT** `/admission/:admissionId/validate`

**Role Required:** ADMIN

**Request:**
```json
{
  "isValid": true,
  "remarks": "All documents verified"
}
```

**Response (200):**
```json
{
  "message": "Application validated. Sent to Principal for approval."
}
```

---

### 8. Approve Admission (Principal Only)
**PUT** `/admission/:admissionId/approve`

**Role Required:** PRINCIPAL

**Request:**
```json
{
  "approve": true,
  "remarks": "Approved",
  "allottedDepartment": "Computer Science",
  "enrollmentNumber": "CS-2024-001"
}
```

**Response (200):**
```json
{
  "message": "Admission approved",
  "studentId": "550e8400-e29b-41d4-a716-446655440002",
  "loginCredentials": {
    "email": "john@college.com",
    "password": "generated_temporary_password",
    "note": "Credentials have been sent to registered email and phone"
  }
}
```

---

## 👨‍🎓 Student Endpoints

### 9. Get Student Dashboard
**GET** `/students/dashboard`

**Response (200):**
```json
{
  "student": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "John Doe",
    "enrollmentNumber": "CS-2024-001",
    "rollNumber": "01",
    "department": "Computer Science",
    "semester": 3,
    "profileImage": "https://s3.amazonaws.com/..."
  },
  "attendance": {
    "percentage": 92.5,
    "status": "GOOD",
    "totalClasses": 40,
    "classesPresent": 37,
    "classesAbsent": 3
  },
  "academicInfo": {
    "cgpa": 7.85,
    "sgpa": 8.10,
    "failedSubjects": 0
  },
  "upcomingExams": [
    {
      "subjectName": "Database Management",
      "examDate": "2024-02-15",
      "examTime": "10:00-12:00",
      "hallNumber": "101",
      "seatNumber": "15"
    }
  ],
  "pendingFees": {
    "totalAmount": 50000,
    "paidAmount": 30000,
    "pendingAmount": 20000,
    "dueDate": "2024-02-28"
  },
  "recentMarks": [
    {
      "subjectName": "Database Management",
      "examType": "IA1",
      "marksObtained": 18,
      "maxMarks": 20,
      "grade": "A"
    }
  ],
  "notifications": [
    {
      "id": "notif-123",
      "title": "Attendance Warning",
      "message": "Your attendance in Data Structures is below 75%",
      "createdAt": "2024-01-25T09:30:00Z",
      "isRead": false
    }
  ]
}
```

---

### 10. Get Student Profile
**GET** `/students/profile`

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@college.com",
  "phone": "9876543210",
  "dateOfBirth": "2005-01-15",
  "gender": "MALE",
  "address": "123 Main St, City",
  "fatherName": "Mr. Doe",
  "motherName": "Mrs. Doe",
  "fatherPhone": "9876543211",
  "enrollmentNumber": "CS-2024-001",
  "department": "Computer Science",
  "semester": 3,
  "batch": 2024,
  "bloodGroup": "O+",
  "emergencyContact": {
    "name": "Relative Name",
    "phone": "9876543212",
    "relation": "Brother"
  }
}
```

---

### 11. Update Student Profile
**PUT** `/students/profile`

**Request:**
```json
{
  "phone": "9876543210",
  "address": "New Address, City",
  "emergencyContact": {
    "name": "Sister",
    "phone": "9876543213",
    "relation": "Sister"
  }
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully"
}
```

---

### 12. Get Student Attendance
**GET** `/students/attendance`

**Query Parameters:**
```
?semester=3&month=January
```

**Response (200):**
```json
{
  "attendance": {
    "overallPercentage": 92.5,
    "subjects": [
      {
        "subjectId": "SUB-101",
        "subjectName": "Database Management",
        "subjectCode": "CS301",
        "teacherName": "Dr. Smith",
        "totalClasses": 20,
        "classesPresent": 19,
        "classesAbsent": 1,
        "percentage": 95.0,
        "lastMarkedDate": "2024-01-25"
      },
      {
        "subjectId": "SUB-102",
        "subjectName": "Data Structures",
        "subjectCode": "CS302",
        "teacherName": "Prof. Johnson",
        "totalClasses": 20,
        "classesPresent": 18,
        "classesAbsent": 2,
        "percentage": 90.0,
        "lastMarkedDate": "2024-01-25"
      }
    ]
  },
  "attendanceHistory": [
    {
      "date": "2024-01-25",
      "subject": "Database Management",
      "status": "PRESENT",
      "teacher": "Dr. Smith"
    }
  ]
}
```

---

### 13. Get Student Marks
**GET** `/students/marks`

**Query Parameters:**
```
?semester=3
```

**Response (200):**
```json
{
  "marks": [
    {
      "subjectId": "SUB-101",
      "subjectName": "Database Management",
      "subjectCode": "CS301",
      "credits": 4,
      "examResults": [
        {
          "examType": "IA1",
          "marksObtained": 18,
          "maxMarks": 20,
          "percentage": 90
        },
        {
          "examType": "IA2",
          "marksObtained": 17,
          "maxMarks": 20,
          "percentage": 85
        },
        {
          "examType": "SEMESTER",
          "marksObtained": 72,
          "maxMarks": 100,
          "percentage": 72
        }
      ],
      "totalMarks": 107,
      "maxMarks": 140,
      "percentage": 76.43,
      "grade": "B+",
      "gradePoints": 7.5,
      "status": "PASS"
    }
  ],
  "summary": {
    "semester": 3,
    "sgpa": 8.10,
    "cgpa": 7.85,
    "totalCredits": 20,
    "earnedCredits": 20,
    "failedSubjects": 0,
    "passedSubjects": 5
  }
}
```

---

### 14. Download Hall Ticket
**GET** `/students/exam/hallticket/:examId`

**Response (200):**
```
(PDF file download)

Headers:
Content-Type: application/pdf
Content-Disposition: attachment; filename="hallticket_CS001_SEM3.pdf"
```

---

### 15. Get Student Fees
**GET** `/students/fees`

**Response (200):**
```json
{
  "fees": [
    {
      "feeId": "FEE-2024-001",
      "academicYear": "2024-25",
      "semester": 1,
      "components": [
        {
          "name": "Tuition Fee",
          "amount": 100000
        },
        {
          "name": "Hostel Fee",
          "amount": 40000
        },
        {
          "name": "Exam Fee",
          "amount": 5000
        },
        {
          "name": "Development Fee",
          "amount": 10000
        }
      ],
      "totalAmount": 155000,
      "dueDate": "2024-02-15",
      "status": "PENDING"
    },
    {
      "feeId": "FEE-2024-002",
      "academicYear": "2024-25",
      "semester": 2,
      "totalAmount": 155000,
      "dueDate": "2024-08-15",
      "status": "PAID",
      "paidDate": "2024-07-20",
      "paymentMethod": "Online",
      "transactionId": "TXN-123456"
    }
  ],
  "summary": {
    "totalDue": 155000,
    "totalPaid": 155000,
    "totalPending": 0,
    "overdueAmount": 0
  }
}
```

---

### 16. Initiate Fee Payment
**POST** `/students/fees/payment/initiate`

**Request:**
```json
{
  "feeId": "FEE-2024-001",
  "amount": 155000,
  "paymentMethod": "ONLINE"
}
```

**Response (200):**
```json
{
  "orderId": "ORDER-2024-001",
  "amount": 155000,
  "paymentGateway": "RAZORPAY",
  "razorpayOrderId": "order_1234567890",
  "razorpayKey": "rzp_live_XXXXXXXXXXXXX",
  "studentEmail": "john@college.com",
  "studentPhone": "9876543210"
}
```

---

### 17. Verify Fee Payment
**POST** `/students/fees/payment/verify`

**Request:**
```json
{
  "razorpayPaymentId": "pay_29QQoUBi66xm2f",
  "razorpayOrderId": "order_1234567890",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Response (200):**
```json
{
  "message": "Payment verified successfully",
  "transactionId": "TXN-2024-001",
  "receiptUrl": "https://s3.amazonaws.com/receipts/receipt_2024_001.pdf"
}
```

---

## 👨‍🏫 Teacher Endpoints

### 18. Get Teacher Dashboard
**GET** `/teachers/dashboard`

**Response (200):**
```json
{
  "teacher": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "name": "Dr. Smith",
    "email": "smith@college.com",
    "department": "Computer Science",
    "designation": "Assistant Professor",
    "profileImage": "https://s3.amazonaws.com/..."
  },
  "subjects": [
    {
      "subjectId": "SUB-101",
      "subjectName": "Database Management",
      "subjectCode": "CS301",
      "semester": 3,
      "department": "Computer Science",
      "enrolledStudents": 60
    }
  ],
  "todayClasses": [
    {
      "subjectId": "SUB-101",
      "subjectName": "Database Management",
      "period": 3,
      "time": "10:00-11:00",
      "room": "A301",
      "enrolledCount": 60
    }
  ],
  "stats": {
    "totalClassesTaught": 15,
    "averageAttendance": 90.5,
    "marksSubmitted": 3,
    "pendingMarksSubmission": 2,
    "studentsWithLowAttendance": 5
  }
}
```

---

### 19. Get Class Attendance List
**GET** `/teachers/attendance/class`

**Query Parameters:**
```
?subjectId=SUB-101&date=2024-01-25
```

**Response (200):**
```json
{
  "subject": "Database Management",
  "date": "2024-01-25",
  "period": 3,
  "totalStudents": 60,
  "students": [
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440002",
      "rollNumber": "01",
      "name": "John Doe",
      "status": "PRESENT"
    },
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440003",
      "rollNumber": "02",
      "name": "Jane Smith",
      "status": "ABSENT"
    }
  ]
}
```

---

### 20. Mark Attendance
**POST** `/teachers/attendance/mark`

**Request:**
```json
{
  "subjectId": "SUB-101",
  "classDate": "2024-01-25",
  "records": [
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440002",
      "status": "PRESENT"
    },
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440003",
      "status": "ABSENT"
    },
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440004",
      "status": "LEAVE"
    }
  ]
}
```

**Response (201):**
```json
{
  "message": "Attendance marked successfully",
  "classDate": "2024-01-25",
  "subjectId": "SUB-101",
  "marked": 60,
  "failed": 0,
  "notificationsTriggered": 2
}
```

---

### 21. Get Marks Entry Form
**GET** `/teachers/marks/entry`

**Query Parameters:**
```
?subjectId=SUB-101&examType=SEMESTER
```

**Response (200):**
```json
{
  "subject": "Database Management",
  "subjectCode": "CS301",
  "examType": "SEMESTER",
  "maxMarks": 100,
  "semester": 3,
  "students": [
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440002",
      "rollNumber": "01",
      "name": "John Doe",
      "currentMarks": null
    },
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440003",
      "rollNumber": "02",
      "name": "Jane Smith",
      "currentMarks": 85
    }
  ]
}
```

---

### 22. Submit Marks
**POST** `/teachers/marks/submit`

**Request:**
```json
{
  "subjectId": "SUB-101",
  "examType": "SEMESTER",
  "marks": [
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440002",
      "marksObtained": 72
    },
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440003",
      "marksObtained": 85
    }
  ]
}
```

**Response (201):**
```json
{
  "message": "Marks submitted successfully",
  "subjectId": "SUB-101",
  "examType": "SEMESTER",
  "marksSubmitted": 60,
  "gradeCalculated": true,
  "notificationsSent": true
}
```

---

### 23. Upload Study Material
**POST** `/teachers/materials/upload`

**Request (multipart/form-data):**
```
file: <PDF or PPT file>
subjectId: SUB-101
title: Database Design Lecture 1
description: Introduction to database design principles
semester: 3
```

**Response (201):**
```json
{
  "materialId": "MAT-2024-001",
  "title": "Database Design Lecture 1",
  "subject": "Database Management",
  "fileUrl": "https://s3.amazonaws.com/materials/mat_2024_001.pdf",
  "uploadedAt": "2024-01-25T10:30:00Z",
  "downloadCount": 0
}
```

---

### 24. Create Assignment
**POST** `/teachers/assignments/create`

**Request:**
```json
{
  "subjectId": "SUB-101",
  "title": "Database Normalization Assignment",
  "description": "Normalize the given tables to 3NF",
  "dueDate": "2024-02-05",
  "maxMarks": 10,
  "attachments": ["url_to_pdf"]
}
```

**Response (201):**
```json
{
  "assignmentId": "ASG-2024-001",
  "title": "Database Normalization Assignment",
  "subject": "Database Management",
  "dueDate": "2024-02-05",
  "createdAt": "2024-01-25T10:30:00Z",
  "notificationSent": true
}
```

---

### 25. View Assignment Submissions
**GET** `/teachers/assignments/:assignmentId/submissions`

**Response (200):**
```json
{
  "assignmentId": "ASG-2024-001",
  "title": "Database Normalization Assignment",
  "dueDate": "2024-02-05",
  "totalSubmissions": 55,
  "submissions": [
    {
      "submissionId": "SUB-2024-001",
      "studentId": "550e8400-e29b-41d4-a716-446655440002",
      "studentName": "John Doe",
      "rollNumber": "01",
      "submittedAt": "2024-02-04T15:30:00Z",
      "status": "SUBMITTED",
      "fileUrl": "https://s3.amazonaws.com/submissions/sub_2024_001.pdf",
      "marks": null
    }
  ]
}
```

---

### 26. Grade Assignment
**POST** `/teachers/assignments/:submissionId/grade`

**Request:**
```json
{
  "marks": 9,
  "feedback": "Excellent normalization! Well structured."
}
```

**Response (200):**
```json
{
  "message": "Assignment graded successfully",
  "marks": 9,
  "studentNotified": true
}
```

---

## 🏫 HOD Endpoints

### 27. Get HOD Dashboard
**GET** `/hod/dashboard`

**Response (200):**
```json
{
  "department": {
    "name": "Computer Science",
    "totalStudents": 180,
    "totalFaculty": 12,
    "semesters": 8
  },
  "statistics": {
    "overallAttendance": 87.5,
    "averageCGPA": 7.2,
    "passPercentage": 94.5,
    "failedStudents": 3,
    "placementPercentage": 92.0
  },
  "semester3": {
    "totalStudents": 60,
    "averageAttendance": 89.2,
    "passPercentage": 96.7,
    "failedStudents": 0,
    "subjectPerformance": [
      {
        "subjectName": "Database Management",
        "averageMarks": 72.5,
        "passPercentage": 98.3
      }
    ]
  },
  "alerts": [
    {
      "type": "LOW_ATTENDANCE",
      "message": "5 students in Sem 3 have attendance below 75%",
      "severity": "HIGH"
    }
  ]
}
```

---

### 28. Get Department Students
**GET** `/hod/students`

**Query Parameters:**
```
?semester=3&sort=name
```

**Response (200):**
```json
{
  "totalStudents": 60,
  "semester": 3,
  "students": [
    {
      "studentId": "550e8400-e29b-41d4-a716-446655440002",
      "enrollmentNumber": "CS-2024-001",
      "name": "John Doe",
      "cgpa": 8.2,
      "attendance": 92.5,
      "status": "ACTIVE",
      "alertStatus": null
    }
  ]
}
```

---

### 29. Get Department Analytics
**GET** `/hod/analytics`

**Query Parameters:**
```
?semester=3&metric=marks
```

**Response (200):**
```json
{
  "department": "Computer Science",
  "semester": 3,
  "metrics": {
    "totalStudents": 60,
    "averageAttendance": 89.2,
    "averageCGPA": 7.85,
    "passPercentage": 96.7,
    "subjectWiseAnalysis": [
      {
        "subject": "Database Management",
        "averageMarks": 72.5,
        "topMarks": 95,
        "lowMarks": 45,
        "passCount": 59,
        "failCount": 1
      }
    ]
  }
}
```

---

### 30. Download Department Report
**GET** `/hod/reports/download`

**Query Parameters:**
```
?semester=3&reportType=academic&format=pdf
```

**Response (200):**
```
(PDF file download)
```

---

## 👨‍💼 Admin Endpoints

### 31. Get Admin Dashboard
**GET** `/admin/dashboard`

**Response (200):**
```json
{
  "statistics": {
    "totalStudents": 720,
    "totalFaculty": 45,
    "totalAdmissions": 150,
    "totalFeeCollected": 2850000,
    "totalFeeOverdue": 180000
  },
  "recentAdmissions": [
    {
      "admissionId": "ADM-2024-001",
      "applicantName": "John Doe",
      "appliedProgram": "Computer Science",
      "status": "APPROVED",
      "processedDate": "2024-01-25"
    }
  ],
  "pendingApprovals": [
    {
      "admissionId": "ADM-2024-005",
      "applicantName": "Jane Smith",
      "status": "VALIDATED"
    }
  ]
}
```

---

### 32. Create Timetable
**POST** `/admin/timetable/create`

**Request:**
```json
{
  "department": "Computer Science",
  "semester": 3,
  "academicYear": "2024-25",
  "schedule": [
    {
      "dayOfWeek": "MONDAY",
      "period": 1,
      "startTime": "09:00",
      "endTime": "10:00",
      "room": "A301",
      "subjectId": "SUB-101",
      "teacherId": "550e8400-e29b-41d4-a716-446655440100"
    }
  ]
}
```

**Response (201):**
```json
{
  "timetableId": "TT-2024-001",
  "department": "Computer Science",
  "semester": 3,
  "publishedAt": "2024-01-25T10:30:00Z",
  "notificationSent": true
}
```

---

### 33. Create Exam Schedule
**POST** `/admin/exam/schedule`

**Request:**
```json
{
  "examName": "Semester 3 Examination",
  "startDate": "2024-02-15",
  "endDate": "2024-03-10",
  "examType": "SEMESTER",
  "schedule": [
    {
      "date": "2024-02-15",
      "time": "10:00-12:00",
      "subject": "Database Management",
      "subjectCode": "CS301",
      "hall": "H101",
      "invigilators": ["550e8400-e29b-41d4-a716-446655440150"]
    }
  ]
}
```

**Response (201):**
```json
{
  "examScheduleId": "ES-2024-001",
  "examName": "Semester 3 Examination",
  "startDate": "2024-02-15",
  "publishedAt": "2024-01-25T10:30:00Z",
  "hallTicketsGenerated": 720,
  "notificationSent": true
}
```

---

### 34. Manage Student Enrollment
**POST** `/admin/students/enroll`

**Request:**
```json
{
  "enrollmentNumbers": ["CS-2024-001", "CS-2024-002"],
  "semester": 3,
  "academicYear": "2024-25"
}
```

**Response (200):**
```json
{
  "message": "Students enrolled successfully",
  "enrolled": 2,
  "failed": 0
}
```

---

### 35. Fee Collection Report
**GET** `/admin/fees/report`

**Query Parameters:**
```
?month=January&year=2024&department=CS
```

**Response (200):**
```json
{
  "month": "January",
  "year": 2024,
  "totalStudents": 180,
  "totalDue": 2700000,
  "totalCollected": 2450000,
  "totalOverdue": 250000,
  "collectionPercentage": 90.7,
  "topCollectorDept": "Computer Science",
  "departments": [
    {
      "name": "Computer Science",
      "totalDue": 900000,
      "collected": 810000,
      "percentage": 90.0
    }
  ]
}
```

---

## 🎯 Principal Endpoints

### 36. Get Principal Dashboard
**GET** `/principal/dashboard`

**Response (200):**
```json
{
  "collegeStats": {
    "totalStudents": 720,
    "totalFaculty": 45,
    "totalDepartments": 4,
    "overallAttendance": 87.5,
    "overallPassPercentage": 95.2,
    "totalFeeCollected": 6800000,
    "totalFeePending": 450000
  },
  "departmentComparison": [
    {
      "name": "Computer Science",
      "totalStudents": 180,
      "attendance": 89.2,
      "passPercentage": 96.7,
      "avgCGPA": 7.85
    },
    {
      "name": "Electronics",
      "totalStudents": 150,
      "attendance": 86.5,
      "passPercentage": 94.2,
      "avgCGPA": 7.45
    }
  ],
  "keyAlerts": [
    {
      "severity": "HIGH",
      "message": "Electronics department attendance below target"
    }
  ],
  "pendingApprovals": {
    "admissions": 5,
    "leaveApplications": 3,
    "budgetRequests": 2
  }
}
```

---

### 37. View All Approvals
**GET** `/principal/approvals`

**Response (200):**
```json
{
  "admissions": [
    {
      "admissionId": "ADM-2024-005",
      "applicantName": "Jane Smith",
      "appliedProgram": "Electronics",
      "validatedDate": "2024-01-25",
      "status": "PENDING_PRINCIPAL_APPROVAL"
    }
  ],
  "leaveApplications": [
    {
      "leaveId": "LEAVE-2024-001",
      "teacherName": "Dr. Johnson",
      "leaveType": "SICK",
      "startDate": "2024-02-01",
      "endDate": "2024-02-03",
      "status": "PENDING"
    }
  ],
  "others": []
}
```

---

### 38. Approve/Reject Admission
**PUT** `/principal/approvals/:admissionId`

**Request:**
```json
{
  "action": "APPROVE",
  "remarks": "Excellent candidate"
}
```

**Response (200):**
```json
{
  "message": "Admission approved",
  "studentCreated": true,
  "enrollmentNumber": "EL-2024-087",
  "credentialsSent": true
}
```

---

### 39. Generate Annual Report
**GET** `/principal/reports/annual`

**Query Parameters:**
```
?year=2024&format=pdf
```

**Response (200):**
```
(PDF file download)

Content includes:
- College overview
- Department-wise statistics
- Student performance analysis
- Fee collection summary
- Faculty details
- Placement statistics
- Achievements and awards
```

---

### 40. Publish Announcement
**POST** `/principal/announcements`

**Request:**
```json
{
  "title": "Semester Exams Postponed",
  "content": "Due to unforeseen circumstances...",
  "priority": "HIGH",
  "targetAudience": "ALL"
}
```

**Response (201):**
```json
{
  "announcementId": "ANN-2024-001",
  "title": "Semester Exams Postponed",
  "publishedAt": "2024-01-25T10:30:00Z",
  "recipients": 720,
  "notificationsSent": true
}
```

---

## 📬 Parent Endpoints

### 41. Get Child Academic Overview
**GET** `/parents/child/:studentId/overview`

**Response (200):**
```json
{
  "child": {
    "name": "John Doe",
    "enrollmentNumber": "CS-2024-001",
    "department": "Computer Science",
    "semester": 3
  },
  "attendance": {
    "percentage": 92.5,
    "status": "GOOD",
    "lastUpdated": "2024-01-25"
  },
  "academicInfo": {
    "cgpa": 8.2,
    "sgpa": 8.10,
    "recentMarks": [
      {
        "subject": "Database Management",
        "examType": "IA1",
        "marksObtained": 18,
        "maxMarks": 20,
        "grade": "A"
      }
    ]
  },
  "notifications": [
    {
      "title": "Attendance Update",
      "message": "Your child has attended all classes this week",
      "date": "2024-01-25",
      "type": "POSITIVE"
    }
  ]
}
```

---

### 42. Get Child Fees Status
**GET** `/parents/child/:studentId/fees`

**Response (200):**
```json
{
  "fees": [
    {
      "semester": 1,
      "totalAmount": 155000,
      "paidAmount": 155000,
      "pendingAmount": 0,
      "status": "PAID",
      "dueDate": "2024-02-15"
    },
    {
      "semester": 2,
      "totalAmount": 155000,
      "paidAmount": 0,
      "pendingAmount": 155000,
      "status": "PENDING",
      "dueDate": "2024-08-15",
      "daysUntilDue": 200
    }
  ]
}
```

---

### 43. Contact Teacher
**POST** `/parents/messages/send`

**Request:**
```json
{
  "teacherId": "550e8400-e29b-41d4-a716-446655440100",
  "subject": "Attendance Concern",
  "message": "My son has been missing classes. Can we discuss?"
}
```

**Response (201):**
```json
{
  "messageId": "MSG-2024-001",
  "status": "SENT",
  "sentAt": "2024-01-25T10:30:00Z",
  "teacherNotified": true
}
```

---

## 🔔 Notification Endpoints

### 44. Get Notifications
**GET** `/notifications`

**Query Parameters:**
```
?limit=10&offset=0&read=false
```

**Response (200):**
```json
{
  "totalUnread": 5,
  "notifications": [
    {
      "notificationId": "NOTIF-2024-001",
      "title": "Marks Published",
      "message": "Your marks for Database Management have been published",
      "type": "MARKS",
      "priority": "HIGH",
      "createdAt": "2024-01-25T10:30:00Z",
      "isRead": false,
      "actionUrl": "/marks"
    }
  ]
}
```

---

### 45. Mark Notification as Read
**PUT** `/notifications/:notificationId/read`

**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

---

## ⚠️ Error Responses

### Common Error Codes

**400 - Bad Request**
```json
{
  "error": "Invalid request body",
  "details": "Email is required"
}
```

**401 - Unauthorized**
```json
{
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

**403 - Forbidden**
```json
{
  "error": "Access denied",
  "requiredRole": "PRINCIPAL"
}
```

**404 - Not Found**
```json
{
  "error": "Resource not found",
  "resource": "Student"
}
```

**409 - Conflict**
```json
{
  "error": "Resource already exists",
  "resource": "Email already registered"
}
```

**500 - Server Error**
```json
{
  "error": "Internal server error",
  "requestId": "req_123456"
}
```

---

## 📊 Pagination

For endpoints that return lists, use pagination:

**Query Parameters:**
```
?limit=20&offset=0&sort=name&order=asc
```

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 🔒 Security Notes

1. **JWT Token**: Valid for 7 days, refresh token extends expiry
2. **Rate Limiting**: 100 requests per minute per IP
3. **CORS**: Allowed from college website domain only
4. **SSL/TLS**: All endpoints require HTTPS in production
5. **Password**: Minimum 8 characters, hashed with bcrypt
6. **Data Encryption**: Sensitive data encrypted at rest

---

## 📝 Testing with Postman

1. Import all endpoints into Postman collection
2. Set base URL: `http://localhost:5000/api`
3. Add JWT token to Authorization header after login
4. Test each endpoint with sample data
5. Verify status codes and response formats

---

**Last Updated:** January 2024
**Version:** 1.0.0