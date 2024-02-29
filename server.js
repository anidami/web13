const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const { body } = require('express/lib/request');
const { Translate } = require('@google-cloud/translate').v2;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    creationDate: { type: Date, default: Date.now },
    updateDate: { type: Date },
    deletionDate: { type: Date },
    isAdmin: { type: Boolean, default: false },
});

const User = mongoose.model('User', UserSchema);

async function requireAdmin(req, res, next) {
    try {
        const user = await User.findById(req.session.userId);
        if (!user || !user.isAdmin) {
            return res.redirect('/login');
        }
        req.session.isAdmin = user.isAdmin;
        next();
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).send('Server Error');
    }
}

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.post('/admin/editUser', requireAdmin, async (req, res) => {
    const { userId, isAdmin, newUsername, newPassword } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        if (isAdmin !== undefined) {
            user.isAdmin = isAdmin;
        }
        if (newUsername) {
            user.username = newUsername;
        }
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
        }
        await user.save();
        res.redirect('/admin');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/deleteUser/:userId', requireAdmin, async (req, res) => {
    const userId = req.params.userId;
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send('Invalid user ID');
        }

        await User.findByIdAndDelete(userId);
        res.redirect('/admin');

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/deleteUser', requireAdmin, async (req, res) => {
    try {
        const deleteUsername = req.body && req.body.deleteUsername;

        if (!deleteUsername) {
            return res.status(400).send('Invalid request: deleteUsername is missing');
        }

        await User.findOneAndDelete({ username: deleteUsername });
        res.redirect('/admin');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/grantAdmin', requireAdmin, async (req, res) => {
    const {username, isAdmin} = req.body;
    try {
        const user = await User.findOne({username});
        if (!user) {
            return res.status(404).send('User not found');
        }
        user.isAdmin = isAdmin || false;
        await user.save();
        res.redirect('/admin');
    } catch (error) {
        console.error('Error granting admin access:', error);
        res.status(500).send('Server Error');
    }
});

app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({});
        res.render('admin', { users, isAdmin: true });
    } catch (error) {
        console.error('Error rendering admin page:', error);
        res.status(500).send('Error rendering admin page');
    }
});



const AsteroidSchema = new mongoose.Schema({
    name: String,
    id: String,
    closestApproachDate: String,
    missDistance: {
        kilometers: Number,
    },
});

const Asteroid = mongoose.model('Asteroid', AsteroidSchema);
const { Schema } = mongoose;

const historySchema = new Schema({

    userRequest: String,
    apiOutcome: String,
    timestamp: { type: Date, default: Date.now }

});

const HistoryEntry = mongoose.model('HistoryEntry', historySchema);



app.get('/asteroids', async (req, res) => {
    try {
        const startDate = req.query.start_date || '2024-02-19';
        const endDate = req.query.end_date || '2024-02-20';
        const apiKey = 'eDGyE7lZFf3q3mTzt7FEtr8GQYxDHmqT1qTjwx7d';

        // Запоминаем запрос пользователя
        const userRequest = `Asteroids API Request: start_date=${startDate}, end_date=${endDate}`;

        const response = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`);
        const asteroidsData = response.data.near_earth_objects[startDate].slice(0, 3);
        const apiOutcome = JSON.stringify(asteroidsData);

        // Сохранение запроса в базу данных
        const historyEntry = new HistoryEntry({
            userRequest,
            apiOutcome,
        });
        await historyEntry.save();

        // Сохранение запроса в базу данных
        const asteroids = asteroidsData.map(async (asteroidData) => {
            const existingAsteroid = await Asteroid.findOne({ id: asteroidData.id });

            if (!existingAsteroid) {
                const newAsteroid = new Asteroid({
                    name: asteroidData.name,
                    id: asteroidData.id,
                    closestApproachDate: asteroidData.close_approach_data[0].close_approach_date,
                    missDistance: {
                        kilometers: asteroidData.close_approach_data[0].miss_distance.kilometers,
                    },
                });

                await newAsteroid.save();

                return newAsteroid;
            }
            return existingAsteroid;
        });

        const savedAsteroids = await Promise.all(asteroids);

        res.render('asteroids', { asteroids: savedAsteroids });
    } catch (error) {
        console.error('Ошибка при получении данных из NeoWs API:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});



const astronomyPicSchema = new mongoose.Schema({
    title: String,
    date: String,
    imageUrl: String,
    explanation: String,
});

const AstronomyPic = mongoose.model('AstronomyPic', astronomyPicSchema);


app.get('/astpic', async (req, res) => {
    try {
        const apiKey = '5WzX9MdljdJlWftvZVqFgkvPGJQgJ7rajx6Bx0hT';

        // Получение данных о фотографии дня на указанную дату
        const date = req.query.date || '';
        const userRequest = `Astronomy Picture API Request: date=${date}`;
        const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${date}`);
        const apodData = response.data;

        // Запоминаем ответ от API
        const apiOutcome = JSON.stringify(apodData);

        // Сохранение запроса в базу данных
        const historyEntry = new HistoryEntry({
            userRequest,
            apiOutcome,
        });
        await historyEntry.save();

        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];

        const existingAstronomyPic = await AstronomyPic.findOne({ date: apodData.date });

        if (!existingAstronomyPic) {
            const newAstronomyPic = new AstronomyPic({
                title: apodData.title,
                date: apodData.date,
                imageUrl: apodData.url,
                explanation: apodData.explanation,
            });

            await newAstronomyPic.save();

            res.render('astpic', { apodData: newAstronomyPic, savedToMongo: true, currentDate });
        } else {
            res.render('astpic', { apodData, savedToMongo: false, currentDate });
        }
    } catch (error) {

        console.error('Ошибка при получении данных из APOD API:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});


app.get('/history', async (req, res) => {
    try {
        const asteroidsHistory = await HistoryEntry.find({ userRequest: { $regex: /Asteroids API Request/ } }).sort({ timestamp: -1 });

        res.render('history', { asteroidsHistory });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).send('Server Error');
    }
});



app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
}));

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}


app.get('/register', (req, res) => {
    res.render('register');
});


app.get('/', (req, res) => {
    res.render('main.ejs');
});


app.get('/login', (req, res) => {
    res.render('login');
});


app.get('/jstart', (req, res) => {
    res.render('jstart');
});


app.get('/historyforpics', async (req, res) => {
    const astPicHistory = await HistoryEntry.find({userRequest: {$regex: /Astronomy Picture API Request/}}).sort({timestamp: -1});
    res.render('historyforpics', {astPicHistory});
});



app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).send('Invalid username or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).send('Invalid username or password');
        }

        req.session.userId = user._id;
        res.redirect('/jstart');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});



app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).send('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({

            username,
            password: hashedPassword,
            creationDate: new Date(),
            updateDate: null,
            deletionDate: null,
            isAdmin: false,

        });

        await newUser.save();

        res.redirect('/login');
    } catch (error) {
        console.error('Error saving user to MongoDB:', error);
        res.status(500).send('Server Error');
    }
});



const formSchema = new mongoose.Schema({

    title: String,
    description: String,
    images: [String],

});

const Form = mongoose.model('Form', formSchema);



const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});



app.get('/rest', async (req, res) => {
    try {

        const forms = await Form.find();


        res.render('rest', { forms });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error });
    }
});



const authenticateToken = (req, res, next) => {
    // Implement JWT authentication logic here
    next();
};



app.get('/restadmin', authenticateToken, requireAdmin, async (req, res) => {
    try {

        const forms = await Form.find();
        res.render('restadmin', { forms });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error });
    }
});


app.get('/restadmin/add', (req, res) => {
    res.render('restadmin-add');
});


app.post('/restadmin/add', async (req, res) => {
    try {
        const { title, description, images } = req.body;
        const imagesArray = images.split(',').map(image => image.trim());
        const newForm = new Form({ title, description, images: imagesArray });

        if (!title || !description || !images) {
            return res.status(400).render('error', { error: new Error('All fields are required') });
        }
        await newForm.save();
        res.redirect('/restadmin');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error });
    }
});



app.get('/restadmin/update/:id', async (req, res) => {
    try {
        const formId = req.params.id;

        // Find the form by ID
        const formToUpdate = await Form.findById(formId);

        if (!formToUpdate) {
            return res.status(404).render('error', { error: new Error('Form not found') });
        }

        res.render('restadmin-edit', { form: formToUpdate });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error });
    }
});


app.post('/restadmin/update/:id', async (req, res) => {
    try {
        const formId = req.params.id;


        const updatedForm = await Form.findByIdAndUpdate(formId, req.body, { new: true });

        if (!updatedForm) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Redirect back to the admin panel
        res.redirect('/restadmin');

    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error });
    }
});


app.delete('/restadmin/delete/:id', async (req, res) => {
    try {
        const formId = req.params.id;

        // Delete the form by ID
        const deletedForm = await Form.findByIdAndDelete(formId);

        if (!deletedForm) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Respond with a success message
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete the form' });
    }
});


app.get('/restadmin', authenticateToken, async (req, res) => {
    try {
        const forms = await Form.find();
        res.render('restadmin', { forms });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});