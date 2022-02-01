import fs from 'fs';

import {
  CompiledContract,
  Contract,
  compileCalldata,
  defaultProvider,
  json,
  number,
  stark,
} from '../src';

// import { toBN } from '../src/utils/number';

const compiledERC20: CompiledContract = json.parse(
  fs.readFileSync('./__mocks__/ERC20.json').toString('ascii')
);

const compiledMulticall: CompiledContract = json.parse(
  fs.readFileSync('./__mocks__/Multicall.json').toString()
);

describe('class Contract {}', () => {
  const wallet = stark.randomAddress();
  let contract: Contract;
  let multicallContract: Contract;
  beforeAll(async () => {
    const {
      code,
      transaction_hash,
      address: erc20address,
    } = await defaultProvider.deployContract(compiledERC20, []);

    contract = new Contract(compiledERC20.abi, erc20address);

    expect(code).toBe('TRANSACTION_RECEIVED');

    await defaultProvider.waitForTx(transaction_hash);

    // Deploy Multicall

    const {
      code: m_code,
      transaction_hash: m_transaction_hash,
      address: multicallAddress,
    } = await defaultProvider.deployContract(compiledMulticall, []);

    multicallContract = new Contract(compiledMulticall.abi, multicallAddress);

    expect(m_code).toBe('TRANSACTION_RECEIVED');

    await defaultProvider.waitForTx(m_transaction_hash);
  });
  test('read initial balance of that account', async () => {
    const response = await contract.call('balance_of', {
      user: wallet,
    });
    expect(number.toBN(response.res as string).toString()).toStrictEqual(number.toBN(0).toString());
  });
  test('add 10 test ERC20 to account', async () => {
    const response = await contract.invoke('mint', {
      recipient: wallet,
      amount: '10',
    });
    expect(response.code).toBe('TRANSACTION_RECEIVED');

    await defaultProvider.waitForTx(response.transaction_hash);
  });
  test('read balance after mint of that account', async () => {
    const response = await contract.call('balance_of', {
      user: wallet,
    });

    expect(number.toBN(response.res as string).toString()).toStrictEqual(
      number.toBN(10).toString()
    );
  });

  test('read balance in a multicall', async () => {
    const { getSelectorFromName } = stark;

    const args1 = { user: wallet };
    const args2 = {};

    const calls = [
      contract.connectedTo,
      getSelectorFromName('balance_of'),
      Object.keys(args1).length.toString(),
      ...compileCalldata(args1),

      contract.connectedTo,
      getSelectorFromName('decimals'),
      Object.keys(args2).length.toString(),
      ...compileCalldata(args2),
    ];

    console.log('🚀 ~ file: contract.test.ts ~ line 81 ~ Contract ~ test ~ calls', calls);

    const response = await multicallContract.call('aggregate', {
      calls,
    });
    // .catch((e) => console.error(e));

    console.log('Original response: ', response);

    // const responseIterator = response.result.flat()[Symbol.iterator]();
    // console.log(
    //   '🚀 ~ file: contract.test.ts ~ line 97 ~ Contract ~ test ~ responseIterator',
    //   responseIterator
    // );

    // const parsedResponse = multicallContract.parseResponse('aggregate', response.result);

    // console.log(
    //   'Parsed Response: ',
    //   toBN(parsedResponse.block_number as string).toString(),
    //   (parsedResponse.result as string[]).map((res) => toBN(res).toNumber())
    // );

    return expect(response);
  });
});
