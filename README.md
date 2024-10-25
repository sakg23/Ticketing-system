# Ticketing System

## Introduction

The Ticketing System is a web-based application designed to efficiently manage customer support tickets. It allows users to create tickets, attach relevant documents, and track their resolution. Agents can view and manage these tickets, categorize them, and communicate with users throughout the resolution process. The system implements role-based access to ensure that only authorized users (admin, agent, user) can access specific functionalities.

This project is part of an initiative to streamline issue tracking and resolution processes, with a focus on security, user experience, and effective communication between agents and users.

## Functional Features

### Implemented Features:
The following key features have been implemented based on the functional requirements (R1-R9, R17):

#### R1: Create Tickets
Users can create tickets by providing a detailed description of the issue, ensuring that all necessary information is captured for resolution.

#### R2: Attachments
Users can upload images and documents to supplement the issue description, providing additional context for agents.

#### R3: Category Assignment
Agents (and users in some cases) can assign categories (e.g., software, hardware, network) to tickets, ensuring proper classification.

#### R4: View and Filter Tickets
Users and agents can view and filter tickets by description, category, status, or user for easy navigation and management.

#### R5: Category Management
Agents have the ability to create new categories, providing flexibility in how tickets are categorized and organized.

#### R6: Ticket Status Update
Both users and agents can update the status of a ticket (e.g., open, in progress, or closed) to track progress.

#### R7: Ticket Resolution Progress
The system tracks ticket resolution progress, showing the agent assigned to the ticket, actions taken, and any comments made, ensuring transparency for users.

#### R8: Knowledge Base
A knowledge base is available for agents to share information and articles about common issues. Agents can also add comments to these articles for collaborative troubleshooting.

#### R9: Single Sign-On (SSO) Integration
The system supports Single Sign-On (SSO) for simplified login and access management.

#### R17: Admin-Only Role Creation
Only the Super Admin can create and assign roles to new agents, maintaining strict control over role assignments.

### Screenshots

#### Home page:
![alt text](<Skärmbild 2024-10-25 181744.png>)

#### Login page: 
![alt text](<Skärmbild 2024-10-25 182302.png>)

#### Admin-dashboard:
![alt text](<Skärmbild 2024-10-25 182412.png>)

Only the Super Admin has the authority to create or register new users. This Super Admin can set up accounts and subsequently provide login credentials, including user-emails and passwords, to users.
![alt text](<Skärmbild 2024-10-25 182419.png>)

#### Super Admin Privileges
The Super Admin has comprehensive access, allowing them to view all submitted tickets and all registered users:
![alt text](<Skärmbild 2024-10-25 182440.png>)

#### Additionally
The Super Admin can modify user roles, converting a user to an agent or vice versa:
![alt text](<Skärmbild 2024-10-25 182427.png>)

#### Upon logging in, a user accesses a personalized dashboard:
![alt text](<Skärmbild 2024-10-25 182743.png>)

#### Ticket Creation:
Users can create new tickets for assistance or support:
![alt text](<Skärmbild 2024-10-25 182805.png>)

#### Viewing User Tickets
Users can access a detailed view of their tickets:
![alt text](<Skärmbild 2024-10-25 182750.png>)

When viewing a specific ticket, users can update the category or toggle the ticket’s status between open and closed.

#### Users have control over changing the ticket category and opening or closing it as needed.
![alt text](<Skärmbild 2024-10-25 183256.png>)

#### Agents have access to their own dashboard:
![alt text](<Skärmbild 2024-10-25 182318.png>)

#### View All Tickets Page for agents
A page to view all active tickets is available:
![alt text](<Skärmbild 2024-10-25 182351.png>)

When agents review a specific ticket, they have the option to update the category and open or close the ticket:
![alt text](<Skärmbild 2024-10-25 182446.png>)

#### View of all registered users:
![alt text](<Skärmbild 2024-10-25 182359.png>)

#### Agents can create new categories in the Articles section:
![alt text](<Skärmbild 2024-10-25 182340.png>)

#### The Articles page allows agents to post helpful articles for other agents. Agents can also add comments to posts, facilitating collaborative discussions and support:
![alt text](<Skärmbild 2024-10-25 184213.png>)

#### Comments on posts are displayed as follows:
![alt text](<Skärmbild 2024-10-25 184221.png>)

#### Ticket-Specific Commenting for Users and Agents
Both agents and users can comment on specific tickets. Users may inquire with agents, and agents can reply directly within the ticket, fostering effective communication:
![alt text](<Skärmbild 2024-10-25 182515.png>)

#### Users, agents, and Admin can View and Filter Tickets:
![alt text](<Skärmbild 2024-10-25 190115.png>)

### Overview
This project provides a platform for managing user accounts, tickets, and labels with QR code functionality. It includes different user roles such as Super Admin, agent, and user, each with unique access levels. Key features include user management, ticket creation, category updates, and interactive comment sections.
Here is your document draft:

---

# Ticketing System Project Guide

## How to Use

### Prerequisites

1. **WSL (Windows Subsystem for Linux) and Ubuntu (For Windows Users)**  
   - If you’re on Windows, ensure that WSL is installed, and you are running the Ubuntu distribution. Install WSL with the following command in PowerShell (run as Administrator):
     ```bash
     wsl --install
     ```
   - After installing WSL, install Ubuntu from the Microsoft Store. Verify if WSL is working by running the following in an Ubuntu terminal:
     ```bash
     wsl -l -v
     ```

2. **Node.js and npm**  
   - Ensure that you have Node.js (version 14.x or higher) installed. You can download it from the [Node.js official website](https://nodejs.org/). Node.js will come with npm, the Node Package Manager, which is required to install project dependencies. Verify the installation by running:
     ```bash
     node -v
     npm -v
     ```

3. **MariaDB (Database)**  
   - The project uses MariaDB for database management. Install MariaDB, then set up the database using the SQL scripts provided in the `sql` folder.  
   - Open MariaDB with the following command:
     ```bash
     mariadb -u <your_username> -p
     source sql/reset.sql;
     ```
   - Ensure the user and password used in the database match those in your `tecktingsystem.json` file.

4. **Environment Variables**  
   - This project does not use a `.env` file, but you can directly modify the database connection in the `config/db/tecktingsystem.json` file:
     ```json
     {
         "host": "localhost",
         "user": "ur-username",
         "password": "ur-password",
         "database": "ticketing_system",
         "multipleStatements": true
     }
     ```

## Build

1. **Clone the Repository**  
   To start, clone the project repository into your local development environment:
   ```bash
   git clone https://github.com/sakg23/ticketing-system
   cd ticketing-system
   ```

2. **Install Dependencies**  
   Since the `node_modules` folder is excluded via `.gitignore`, you need to install all dependencies manually:
   ```bash
   npm install
   ```

3. **Set Up the Database**  
   Initialize the MariaDB database using the provided SQL scripts located in the `sql` folder. Run the reset script to create the tables and stored procedures:
   ```bash
   mariadb -u <your_username> -p
   source sql/reset.sql;
   ```

## Test

1. **Manual Testing Workflow**  
   - Start the server:
     ```bash
     node index.js
     ```
   - Monitor the logs in the terminal to identify any issues with the server, database, or file uploads.

2. **Database Testing**  
   - Verify database operations by running SQL queries in MariaDB. For example, after creating a new ticket, run this query to check if the ticket was added:
     ```sql
     SELECT * FROM tickets WHERE user_id = 1;
     ```

## Run

1. **Start the Server**  
   - Navigate to the root directory of the project and start the server:
     ```bash
     node index.js
     ```
   - The application will be accessible by default at `http://localhost:3000`.

2. **Access the Application**  
   - Visit `http://localhost:3000` in your web browser to access the web application.

## Admin Login

- Use the default admin credentials to log in:
  - **Email:** `admin@admin.ts`
  - **Password:** `9912`

- **User Login:** After the admin creates users, they can log in with their credentials.

## Managing Tickets and Users

1. **Admin Functions**  
   - Admins can view and manage all tickets and users via the `/admin-dashboard` and `/admin-view-all-users` `/admin-view-all-tickets` pages.

2. **Agent Functions**  
   - Agents can manage tickets, update categories, and comment on tickets.

3. **User Functions**  
   - Users can create tickets, view their tickets, and comment on them.

4. **Features**
   - **File Uploads:** Users can upload attachments with tickets, stored in the `uploads/` folder with information saved in the database.
   - **Commenting System:** Agents and users can comment on tickets to collaborate on resolutions.
   - **Roles:** Admins, agents, and users have distinct roles and permissions.
   - **Ticket Management:** Users can create tickets; agents and admins can manage them (change status, update categories).
   - **Dashboard:** Users, agents, and admins each have a dashboard with role-specific features.

## Stopping the Server

- When done, stop the server by pressing `CTRL + C` in the terminal where the server is running.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
