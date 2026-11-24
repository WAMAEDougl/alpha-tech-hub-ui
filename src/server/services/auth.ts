import * as bcrypt from "bcryptjs";
import { UnauthorizedException } from "../http";
import { signToken } from "../auth";
import type { CreateUserDto } from "../dto";
import { UsersService } from "./users";

// Compared against when the email is unknown, so response time does not reveal which emails exist.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("timing-equalizer", 12));

export class AuthService {
  constructor(private users: UsersService) {}

  async register(dto: CreateUserDto) {
    const user = await this.users.create(dto);
    return this.session(user);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.users.findByEmail(dto.email);
    const valid = await bcrypt.compare(dto.password, user?.password ?? getDummyHash());
    if (!user || !valid || !user.isActive) throw new UnauthorizedException("Invalid email or password");
    return this.session(user);
  }

  private async session(user: { id: string; email: string; role: string; name: string }) {
    return { access_token: await signToken(user), user: { id: user.id, email: user.email, role: user.role, name: user.name } };
  }
}
