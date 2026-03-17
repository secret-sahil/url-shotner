import { Test, TestingModule } from '@nestjs/testing';
import { ShortController } from './short.controller';
import { ShortService } from './short.service';

describe('ShortController', () => {
  let controller: ShortController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortController],
      providers: [ShortService],
    }).compile();

    controller = module.get<ShortController>(ShortController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
