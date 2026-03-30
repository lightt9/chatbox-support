import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  async findAllUsers(companyId: string) {
    // TODO: Implement list admin/agent users
    return [];
  }

  async findOneUser(id: string) {
    // TODO: Implement find user by id
    return null;
  }

  async createUser(data: any) {
    // TODO: Implement create admin/agent user
    return null;
  }

  async updateUser(id: string, data: any) {
    // TODO: Implement update user
    return null;
  }

  async removeUser(id: string) {
    // TODO: Implement delete user
    return null;
  }

  async updateUserRole(id: string, role: string) {
    // TODO: Implement update user role
    return null;
  }
}
