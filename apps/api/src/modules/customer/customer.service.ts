import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomerService {
  async findAll(companyId: string) {
    // TODO: Implement list customers
    return [];
  }

  async findOne(id: string) {
    // TODO: Implement find customer by id
    return null;
  }

  async create(data: any) {
    // TODO: Implement create customer
    return null;
  }

  async update(id: string, data: any) {
    // TODO: Implement update customer
    return null;
  }

  async remove(id: string) {
    // TODO: Implement delete customer
    return null;
  }

  async getConversations(customerId: string) {
    // TODO: Implement get customer conversations
    return [];
  }
}
