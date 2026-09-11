import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/school-crm';

async function updateAliRaza() {
  try {
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    const studentSchema = new mongoose.Schema({}, { strict: false });
    const Student = mongoose.model('Student', studentSchema, 'students');

    // Search for Ali Raza
    console.log('\nSearching for Ali Raza student...');
    const student = await Student.findOne({
      $or: [
        { firstName: 'Ali', lastName: 'Raza' },
        { firstName: 'Ali Raza' },
      ],
    });

    if (!student) {
      console.log('Ali Raza not found. Showing first 5 students with "Ali"...');
      const aliStudents = await Student.find({ firstName: /Ali/i })
        .select('firstName lastName parentPhone')
        .limit(5);
      console.log(aliStudents);
    } else {
      console.log('Found:', student.firstName, student.lastName);
      console.log('Current phone:', student.parentPhone || '(not set)');

      const result = await Student.updateOne(
        { _id: student._id },
        { $set: { parentPhone: '9876543210' } }
      );

      console.log('\n✓ Updated successfully!');
      console.log('New phone: 9876543210 (masked as: 987****3210)');

      // Verify
      const updated = await Student.findById(student._id);
      console.log('Verification - Phone now:', updated.parentPhone);
    }

    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateAliRaza();
