import { Test, TestingModule } from '@nestjs/testing';
import { BankReconciliationController } from './bank-reconciliation.controller';

describe('BankReconciliationController', () => {
  let controller: BankReconciliationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankReconciliationController],
    }).compile();

    controller = module.get<BankReconciliationController>(BankReconciliationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
