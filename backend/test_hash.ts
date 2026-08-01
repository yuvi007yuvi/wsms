import bcrypt from 'bcrypt';
async function test() {
  const match = await bcrypt.compare('admin123', '$2b$10$hJBjm5HeCt5T0eNxB7N2v.WAhhmM2uPxZUi00GTg6U7s9TUmIs1We');
  console.log('Match?', match);
}
test();
