const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '50mb' }));

app.use('/generate/word', require('./routes/word'));
app.use('/generate/pdf', require('./routes/pdf'));
app.use('/generate/excel', require('./routes/excel'));
app.use('/generate/ppt', require('./routes/ppt'));

app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Document Generator running on port ${PORT}`));
