import pool from '../config/database.js';
import { clearComplaints } from './clearComplaints.js';

const complaintId = process.argv[2];

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(complaintId || '')) {
  console.error('Usage: node src/db/removeComplaint.js <complaint-uuid>');
  process.exitCode = 1;
} else {
  clearComplaints({ complaintIds: [complaintId] })
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('Complaint removal failed:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}
