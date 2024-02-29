Hello! This is my assignment #4. This project is a web application developed using Node.js, Express, MongoDB, and other technologies dedicated to space exploration. The project includes 
user management functionalities, NASA API requests for retrieving asteroid data, and displaying Astronomy Picture of the Day. Additionally, a RESTful API has been created and implemented, featuring a main page and an admin page that includes pages for CRUD operations. Admins have the capability to edit, delete, and add items related to the space theme on the main page for the REST API.

API NeoWs: Retrieves data about asteroids passing near Earth.
API Astronomy Picture of the Day (APOD): Fetches daily astronomy pictures.

Features
User Registration and Authentication: Users can register, authenticate, and log in to explore various features.
Regarding language usage, all main pages are in English as they contain basic words, ensuring users with even a low level of English can navigate the site easily. 
The site is designed to be simple and user-friendly, allowing intuitive navigation thanks to its well-thought-out design. In other words, the site has multi-language support, allowing users to select their preferred language for a personalized experience.

User Management: Administrators can view, edit, and delete users. (LOGIN: anidaa PASSWORD: 123)
REST API Management: Admins can add, modify, edit, and delete forms with three images placed in a carousel, along with their titles and descriptions.
Asteroid Information Retrieval: Users can obtain data about asteroids, including closest approach date and miss distance.
Astronomy Picture of the Day: Users can explore daily astronomy pictures with detailed explanations.
Query History: The application stores user query history, capturing queries to the NeoWs API and APOD API along with their results on separate pages for asteroids and daily photos.

Technologies and Tools Used
Node.js and Express.js: Backend development.
MongoDB and Mongoose: Storage of user data, asteroid information, astronomy pictures, and query history.
bcryptjs: Hashing user passwords for secure storage and authentication.
Axios: Making HTTP requests to NASA APIs.
dotenv: Loading configuration from the .env file.
ejs: Creating and displaying HTML templates.
body-parser: Processing form data in requests.

Installation and Launch
1. Clone the repository to your computer. - https://github.com/anidami/web13
2. Install dependencies:
npm install
3. Create a .env file in the project's root directory and add necessary environment variables.
4. Run the application in the terminal of the project folder:
node server.js
5. Open the application in your browser at http://localhost:3000.

But also you can just open the vercel link with deployment I did.

Notes
For administrative access: LOGIN: anidaa PASSWORD: 123
Port: 3000

Made by Mitalipova Anida SE-2230
