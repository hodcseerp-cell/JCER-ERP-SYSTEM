import axios from 'axios';

async function run() {
  try {
    console.log('Logging in to get admin token...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@college.com',
      password: 'password123',
    });
    const token = loginRes.data.data.token;
    console.log('Token obtained:', token.substring(0, 20) + '...');

    console.log('\nFetching admissions list to get a valid student ID...');
    const listRes = await axios.get('http://localhost:5000/api/admin/admissions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const student = listRes.data.data[0];
    if (!student) {
      console.log('No students found in the database!');
      return;
    }
    const studentId = student.id;
    console.log('Using student ID:', studentId);

    console.log('\nFetching document gapCertificate...');
    const docUrl = `http://localhost:5000/api/admin/admissions/${studentId}/documents/gapCertificate?token=${encodeURIComponent(token)}`;
    console.log('Request URL:', docUrl);

    const docRes = await axios.get(docUrl);
    console.log('\nResponse Status:', docRes.status);
    console.log('Response Headers:', docRes.headers);
    console.log('Response Data length:', String(docRes.data).length);
  } catch (error: any) {
    console.error('\nError Fetching Document:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

run();
