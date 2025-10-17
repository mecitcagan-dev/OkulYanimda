// backend/tests/supabaseService.test.js

const insertMock = jest.fn().mockReturnThis();
const selectMock = jest.fn().mockReturnThis();
const singleMock = jest.fn().mockResolvedValue({ data: { id: 1 }, error: null });
const fromMock = jest.fn(() => ({ insert: insertMock, select: selectMock, single: singleMock }));

const uploadMock = jest.fn().mockResolvedValue({ data: {}, error: null });
const storageFromMock = jest.fn(() => ({ upload: uploadMock }));

const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
const gteMock = jest.fn().mockReturnThis();
const lteMock = jest.fn().mockReturnThis();

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table) => {
      const q = { insert: insertMock, select: selectMock, single: singleMock };
      if (table === 'videos') {
        return {
          select: () => ({ order: orderMock, gte: gteMock, lte: lteMock }),
          insert: () => ({ select: selectMock, single: singleMock }),
        };
      }
      return q;
    },
    storage: { from: storageFromMock },
  })),
}));

const { uploadFileToBucket, insertMetadata, getVideos } = await import('../services/supabaseService.js');

describe('supabaseService', () => {
  it('builds public URL after upload', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    const url = await uploadFileToBucket(__filename, 'test.webm');
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/videos/test.webm');
    expect(storageFromMock).toHaveBeenCalledWith('videos');
  });

  it('inserts metadata', async () => {
    const row = await insertMetadata({ filename: 'a.mp4', created_at: new Date(), optimized_url: 'http://x' });
    expect(row).toEqual({ id: 1 });
  });

  it('gets videos without filter', async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });
    const rows = await getVideos({});
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('gets videos with date filter', async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: 2 }], error: null });
    const rows = await getVideos({ date: '2025-10-16' });
    expect(gteMock).toHaveBeenCalled();
    expect(lteMock).toHaveBeenCalled();
    expect(rows).toEqual([{ id: 2 }]);
  });
});
