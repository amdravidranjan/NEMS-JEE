# JEE Allotment System

![Release](https://img.shields.io/badge/Release-v1.0.0-blueviolet?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Completed-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-success?style=for-the-badge)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Oracle](https://img.shields.io/badge/Oracle-F80000?style=for-the-badge&logo=oracle&logoColor=white)

Hey everyone! Welcome to the JEE Allotment System. 

We built this application as a miniproject for our Fourth Semester DBMS (Database Management Systems) course. We wanted to see what it takes to recreate the entire lifecycle of a national entrance exam—from the moment a student registers, to writing a live computerized test, all the way to generating percentile rankings and allotting college seats!

We decided to push as much heavy lifting as possible into the database layer. So, you'll find that things like percentile generation and preventing double-booking are handled rapidly in the background using Oracle DB's stored procedures, views, and automated triggers, while Python and Flask just serve the frontend beautifully.

---

## Developers

This project was brought to life by:
- **Dravid Ranjan.A.M**
- **Guhanesh.M.L**
- **Saisaravanan. S**

---

## Setup & Technical Documentation

If you want to spin this up on your local machine, we've written a detailed step-by-step setup guide.

[![Setup Guide](https://img.shields.io/badge/Read%20The-SETUP_GUIDE-blue?style=for-the-badge)](SETUP.md)

If you'd like to look under the hood at the 16 tables, the stored procedures, and the Oracle DB triggers making this project tick, please check out our detailed technical teardown!

[![Technical Details](https://img.shields.io/badge/Read%20The-TECHNICAL__DETAILS-darkred?style=for-the-badge)](TECHNICAL_DETAILS.md)

---

## Inspiration

*The overall User Interface and styling of this project was heavily inspired by the gorgeous, minimalistic design of [web3compass.xyz](https://web3compass.xyz).*

---

## Contribute!

Feel completely free to clone, fork, and contribute to this project. We'd love to see what you can add to it or how you might use it to learn more about relational databases!

---

## Gallery

Here's a quick look at how the application turned out.

### Authentication & Registration
<p align="center">
  <img src="screenshots/entry.png" alt="Landing Page" width="45%">
  <img src="screenshots/registration.png" alt="Registration Step 1" width="45%">
</p>

### The Candidate Experience
<p align="center">
  <img src="screenshots/Dashboard.png" alt="Dashboard" width="45%">
  <img src="screenshots/ExamPortal.png" alt="Exam Portal" width="45%">
</p>
<p align="center">
  <img src="screenshots/allotment.png" alt="Seat Allotment Results" width="45%">
  <img src="screenshots/SeatMatrix.png" alt="Seat Matrix View" width="45%">
</p>

### The Administrator Experience
<p align="center">
  <img src="screenshots/AdminDashboard_admin.png" alt="Admin Overview" width="45%">
  <img src="screenshots/Sessions_admin.png" alt="Admin Exam Sessions" width="45%">
</p>
