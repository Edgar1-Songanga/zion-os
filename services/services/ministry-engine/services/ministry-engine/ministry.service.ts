import { Ministry } from "@/components/ministry/types";
import { MinistryRepository } from "./ministry.repository";


export class MinistryService {

  constructor(
    private repository: MinistryRepository
  ) {}


  async getMinistry(
    id: string
  ): Promise<Ministry | null> {

    return this.repository.getById(id);

  }



  async listMinistries(): Promise<Ministry[]> {

    return this.repository.getAll();

  }


  }
