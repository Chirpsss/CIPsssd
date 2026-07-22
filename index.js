const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '50mb' }));

app.use('/generate/word', require('./word'));
app.use('/generate/pdf', require('./pdf'));
app.use('/generate/excel', require('./excel'));
app.use('/generate/ppt', require('./ppt'));
app.use('/search', require('./search'));

app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Document Generator running on port ${PORT}`));
