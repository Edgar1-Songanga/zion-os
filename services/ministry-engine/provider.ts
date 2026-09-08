import { MinistryService } from "./ministry.service";
import { MinistryMockRepository } from "./ministry.mock.repository";


const ministryRepository =
  new MinistryMockRepository();


export const ministryService =
  new MinistryService(
    ministryRepository
  );
