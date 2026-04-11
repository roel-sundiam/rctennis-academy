# 🎾 Tennis Court Booking System -- Full Build Prompt

## 📌 Project Overview

Build a **tennis court booking system** using the following stack:

-   Frontend: Angular (latest version)
-   Backend: Express.js (Node.js)
-   Database: MongoDB

The system is designed for a **tennis club** where: - Users (players) DO
NOT need login - Admin manages players and approves bookings - Bookings
go through an approval process before becoming final

------------------------------------------------------------------------

# 👥 User Roles

## 1. Player (No Login Required)

-   Can book a court by selecting their name from a predefined list
-   Cannot directly confirm bookings
-   Bookings are submitted as **PENDING**

## 2. Admin

-   Has login access (simple authentication is fine)
-   Can:
    -   Manage players (CRUD)
    -   View bookings
    -   Approve or reject bookings

------------------------------------------------------------------------

# 🧠 Core System Concept

### Booking Flow:

1.  Player selects:
    -   Name (dropdown from players list)
    -   Date
    -   Start time
    -   End time
2.  Player submits booking
3.  System saves booking as: status: 'pending'
4.  Admin reviews booking
5.  Admin:
    -   Approves → becomes official booking
    -   Rejects → booking is declined

👉 Only **approved bookings block time slots**

------------------------------------------------------------------------

# 🗄️ Database Design

## Players Collection

{ \_id, name, contactNumber (optional), isActive: true, createdAt }

------------------------------------------------------------------------

## Reservations Collection

{ \_id, playerId, playerName, courtId, ReserveDate, StartTime, EndTime,
status: 'pending' \| 'approved' \| 'rejected' \| 'cancelled', createdAt,
approvedBy, approvedAt }

------------------------------------------------------------------------

# ⚙️ Backend Requirements (Express.js)

## Player APIs

GET /players\
POST /players\
PUT /players/:id\
DELETE /players/:id (soft delete)

------------------------------------------------------------------------

## Reservation APIs

POST /reservations\
GET /reservations?status=pending\
GET /reservations?status=approved\
PATCH /reservations/:id/approve\
PATCH /reservations/:id/reject

------------------------------------------------------------------------

## Conflict Logic

existing.Start \< new.End && existing.End \> new.Start

------------------------------------------------------------------------

# 💻 Frontend Requirements (Angular)

## Player Booking Page

-   Dropdown of players
-   Date picker
-   Time selection
-   Submit booking

------------------------------------------------------------------------

## Admin Dashboard

-   Pending Bookings
-   Approved Bookings
-   Rejected Bookings

------------------------------------------------------------------------

# 🚀 Goal

Build a simple, scalable tennis booking system with admin approval
workflow.
