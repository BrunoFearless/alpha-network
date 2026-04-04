import { Test, TestingModule } from '@nestjs/testing';
import { LazerService } from './lazer.service';

describe('LazerService', () => {
  let service: LazerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LazerService],
    }).compile();

    service = module.get<LazerService>(LazerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
