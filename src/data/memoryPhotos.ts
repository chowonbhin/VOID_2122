/** Fixed storefront examples: not personal uploads or Visit records. */
export const MEMORY_PHOTOS = [
  {
    placeId: 'naver-ae318ce3e729e02e81ef',
    src: '/memories/donis-storefront.jpg',
    alt: '도니스커피 간판과 유리창이 보이는 실제 가게 외관',
    sourceLabel: '함께할개 · 네이버 지도 매장 사진',
    sourceUrl: 'https://hamgae.com/place/45002/%EB%8F%84%EB%8B%88%EC%8A%A4%EC%BB%A4%ED%94%BC/',
    checkedAt: '2026-11-08',
    note: '골목에서 만난 커피 한 잔의 자리',
  },
  {
    placeId: 'naver-1d7e281c7c50afba23e0',
    src: '/memories/choji-storefront.jpg',
    alt: '초지참숯불갈비 간판과 출입문이 보이는 실제 가게 외관',
    sourceLabel: '안산시 · 안산맛집 매장 소개',
    sourceUrl: 'https://food.ansan.go.kr/ASF/bbs/board.php?bo_table=s11&wr_id=433',
    checkedAt: '2026-11-08',
    note: '한 끼의 온기를 기억하고 싶은 곳',
  },
] as const;

export type MemoryPhoto = typeof MEMORY_PHOTOS[number];
