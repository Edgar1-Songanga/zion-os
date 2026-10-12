import { AIGatewayTranslationProvider } from '@zion/translation-engine';

describe('AIGatewayTranslationProvider.translateBatch', () => {
  const provider = new AIGatewayTranslationProvider({ apiKey: 'test-key', model: 'test-model' });
  const request = {
    sourceLocale: 'pt-AO' as const,
    targetLocale: 'en' as const,
    items: [
      { id: 'dashboard', text: 'Painel', contentType: 'ui' as const },
      { id: 'prayer', text: 'Oração', contentType: 'spiritual' as const },
    ],
  };

  afterEach(() => jest.restoreAllMocks());

  it('uses one model call and preserves request order and ids', async () => {
    const responseBody = {
      choices: [{ message: { content: JSON.stringify({ items: [
        { id: 'prayer', text: 'Prayer' },
        { id: 'dashboard', text: 'Dashboard' },
      ] }) } }],
    };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(responseBody),
    } as Response);

    const result = await provider.translateBatch(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.items.map(({ id, text }) => [id, text])).toEqual([
      ['dashboard', 'Dashboard'],
      ['prayer', 'Prayer'],
    ]);
    expect(result.items.every((item) => item.translated)).toBe(true);
  });

  it('rejects a provider response that omits a requested item', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ items: [{ id: 'dashboard', text: 'Dashboard' }] }) } }],
      }),
    } as Response);

    await expect(provider.translateBatch(request)).rejects.toThrow('incomplete batch');
  });

  it('rejects duplicate request ids before making a network call', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(provider.translateBatch({
      ...request,
      items: [{ id: 'same', text: 'One' }, { id: 'same', text: 'Two' }],
    })).rejects.toThrow('must be unique');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
