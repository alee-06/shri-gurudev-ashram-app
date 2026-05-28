export const profileData = {
  memberSince: '12 Aug 2024',
  completedYatras: 3,
  upcomingYatras: 1,
  totalDonations: '₹1,08,000',
  donationsMade: 12,
};

export const upcomingYatrasMock = [
  {
    id: 'y1',
    destination: 'Kedarnath Yatra',
    date: '12 Sep 2026',
    status: 'Upcoming' as const,
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1400&auto=format&fit=crop',
  },
];

export const savedEventsMock = [
  {
    id: 'e1',
    title: 'Morning Satsang with Gurudev',
    date: 'Tomorrow, 6:00 AM',
    image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1400&auto=format&fit=crop',
  },
  {
    id: 'e2',
    title: 'Ganga Aarti Livestream',
    date: 'Sun, 7:00 PM',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1400&auto=format&fit=crop',
  },
];

export const donationCategoriesMock = [
  { id: 'd1', title: 'Anna Daan', amount: '₹45,000' },
  { id: 'd2', title: 'Temple Restoration', amount: '₹50,000' },
  { id: 'd3', title: 'Gau Seva', amount: '₹13,000' },
];
