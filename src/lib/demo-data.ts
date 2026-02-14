export type DemoContent = {
  id: string;
  title: string;
  type: "ARTICLE" | "VIDEO" | "MUSIC";
  price: string;
  onlyForSubscribers: boolean;
};

export type DemoCreator = {
  id: string;
  username: string;
  category: string;
  subscriptionFee: string;
  subscriberCount: number;
  contents: DemoContent[];
};

export const demoCreators: DemoCreator[] = [
  {
    id: "demo-creator-1",
    username: "demo",
    category: "music",
    subscriptionFee: "9.99",
    subscriberCount: 214,
    contents: [
      {
        id: "demo-content-1",
        title: "Neon Nights (Exclusive Mix)",
        type: "MUSIC",
        price: "2.49",
        onlyForSubscribers: false
      },
      {
        id: "demo-content-2",
        title: "Studio Session Breakdown",
        type: "VIDEO",
        price: "4.99",
        onlyForSubscribers: true
      }
    ]
  },
  {
    id: "demo-creator-2",
    username: "inksignal",
    category: "articles",
    subscriptionFee: "6.50",
    subscriberCount: 89,
    contents: [
      {
        id: "demo-content-3",
        title: "How I Write Weekly Paid Essays",
        type: "ARTICLE",
        price: "1.99",
        onlyForSubscribers: false
      }
    ]
  },
  {
    id: "demo-creator-3",
    username: "framegrid",
    category: "video",
    subscriptionFee: "12.00",
    subscriberCount: 341,
    contents: [
      {
        id: "demo-content-4",
        title: "Lighting Setups for One-Person Shoots",
        type: "VIDEO",
        price: "3.99",
        onlyForSubscribers: false
      }
    ]
  }
];

export function getDemoCreatorByUsername(username: string) {
  return demoCreators.find((creator) => creator.username === username) ?? null;
}
