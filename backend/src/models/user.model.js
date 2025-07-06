export class User {
  constructor(name, email, age, phone_no, address, points, ) {
    this.name = name;
    this.email = email;
    this.age = age;
    this.phone_no = phone_no;
    this.address = address;
    this.createdAt = new Date();
  }
}
