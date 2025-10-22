import bcrypt from "bcrypt";

const passwords = [
  { username: "superadmin", plain: "super123" },
  { username: "branchadmin", plain: "admin123" },
  { username: "teacher1", plain: "teach123" },
  { username: "student1", plain: "stud123" },
  { username: "accountant1", plain: "acct123" },
  { username: "clerk1", plain: "clerk123" }
];

for (const { username, plain } of passwords) {
  const hash = await bcrypt.hash(plain, 10);
  console.log(`${username} (${plain}) => ${hash}`);
}

