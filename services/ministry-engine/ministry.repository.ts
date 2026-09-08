import { Ministry } from "@/components/ministry/types";


export interface MinistryRepository {

  getById(
    id: string
  ): Promise<Ministry | null>;


  getAll(): Promise<Ministry[]>;

  }
