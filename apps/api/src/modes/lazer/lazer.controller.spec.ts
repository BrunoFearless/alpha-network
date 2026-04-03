import { Test, TestingModule } from '@nestjs/testing';
import { LazerController } from './lazer.controller';
import { LazerService } from './lazer.service';

describe('LazerController', () => {
  let controller: LazerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LazerController],
      providers: [LazerService],
    }).compile();

    controller = module.get<LazerController>(LazerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
