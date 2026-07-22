const _ = require('lodash'),
  bcrypt = require('bcrypt'),
  jwt = require('jsonwebtoken'),
  User = require('../models/User'),
  filterFields = [
    'passwordHash',
    'token'
  ];


module.exports = {
    create: async (req, res) => {
        try {
          const { username, email, password, profile = {}, preferences = {} } = req.body,
      
          // Hash the password before saving
           passwordHash = await bcrypt.hash(password, 10),
      
           newUser = new User({
            username,
            email,
            passwordHash,
            profile,
            preferences
          }),
      
           savedUser = await newUser.save(),
           user = _.omit(savedUser.toObject(), 'passwordHash');

          res.status(201).json(user);
        } catch (error) {
          res.status(400).json({ message: error.message });
        }
    },
    getAllUsers: async (req, res) => {
        try {
          const users = await User.find();

          // Remove the passwordHash field from each user
          const filteredUsers = users.map(user => _.omit(user.toObject(), filterFields));

          res.status(200).json(filteredUsers);
        } catch (error) {
          res.status(500).json({ message: error.message });
        }
    },
    getUserById: async (req, res) => {
        try {
          const user = await User.findById(req.params.id);
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
          res.status(200).json(user);
        } catch (error) {
          res.status(500).json({ message: error.message });
        }
    },
    updateUser: async (req, res) => {
        try {
            const { username, email, password, profile, preferences } = {} = req.body;
        
            // Find the user by ID
            const user = await User.findById(req.params.id);
            if (!user) {
              return res.status(404).json({ message: 'User not found' });
            }
        
            // Update fields
            if (username) user.username = username;
            if (email) user.email = email;
            if (password) user.passwordHash = await bcrypt.hash(password, 10);
            if (profile) user.profile = profile;
            if (preferences) user.preferences = preferences;
        
            const updatedUser = await user.save();

            // Remove the passwordHash field from the user
            filteredUser = _.omit(updatedUser.toObject(), filterFields);

            res.status(200).json(filteredUser);
          } catch (error) {
            res.status(400).json({ message: error.message });
          }
    },
    deleteUser: async (req, res) => {
        try {
            const user = await User.findByIdAndDelete(req.params.id);

            if (!user) {
              return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({ message: 'User deleted' });
          } catch (error) {
            res.status(500).json({ message: error.message });
          }
    },
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
        
            // Find the user by email
            const user = await User.findOne({ email });
            if (!user) {
              return res.status(404).json({ message: 'User not found' });
            }

            // Compare the password
            const match = await bcrypt.compare(password, user.passwordHash);
            if (!match) {
              return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Generate a JWT token
            const token = jwt.sign({ id: user._id }, process.env.JWT_KEY, { expiresIn: '1d' });

            // Add token to the user object and save in mongodb
            user.token = token;
            await user.save();

            res.status(200).json({ token });
          } catch (error) {
            res.status(500).json({ message: error.message });
          }
    }
};
