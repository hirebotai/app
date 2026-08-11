export interface Block {
  kind: 'p' | 'list' | 'code';
  text?: string;
  items?: string[];
  code?: string;
}

export interface BlogSection {
  title?: string;
  blocks: Block[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  sections: BlogSection[];
}

export const posts: BlogPost[] = [
  {
    slug: 'coding-interview-preparation-guide',
    title: 'How to Prepare for Coding Interviews in 30 Days',
    description:
      'A day-by-day 30-day plan to go from rusty to interview-ready: data structures, algorithms, mock interviews and the exact practice schedule that works.',
    date: '2026-08-01',
    readTime: '8 min read',
    category: 'Interview Prep',
    sections: [
      {
        title: 'Why a plan beats random practice',
        blocks: [
          {
            kind: 'p',
            text: 'Most developers fail coding interviews not because they are weak engineers, but because they practice without structure. Random LeetCode in the evenings feels productive yet rarely maps to what interviewers actually ask. A 30-day plan fixes that by covering the highest-frequency patterns first, in order of importance.',
          },
        ],
      },
      {
        title: 'Weeks 1–2: Patterns, not problems',
        blocks: [
          {
            kind: 'p',
            text: 'Interview questions are built from a small set of reusable patterns. Instead of grinding 500 problems, master the pattern behind each of these:',
          },
          {
            kind: 'list',
            items: [
              'Two pointers and sliding window',
              'Fast and slow pointers (cycle detection)',
              'Merge intervals',
              'Cyclic sort and in-place array manipulation',
              'Breadth-first search and depth-first search on graphs',
              'Top K elements (heaps)',
              'Backtracking and recursion',
              'Dynamic programming on grids and strings',
            ],
          },
          {
            kind: 'p',
            text: 'For each pattern, solve 5–8 representative problems and write down the skeleton approach in your own words. Explaining the pattern back to yourself is what builds recall under pressure.',
          },
        ],
      },
      {
        title: 'Week 3: Time to talk',
        blocks: [
          {
            kind: 'p',
            text: 'By week three, start every practice session the way you would in a real interview: read the problem out loud, clarify constraints, state your approach and its complexity, then code. If you cannot explain the brute force first, slow down. Interviewers score communication almost as heavily as correctness.',
          },
          {
            kind: 'code',
            code: `function explain(problem) {
  // 1. Restate the problem and constraints
  // 2. Propose a brute-force approach + complexity
  // 3. Optimize: identify the bottleneck pattern
  // 4. Code with a running commentary
  // 5. Walk through a small example and edge cases
}`,
          },
        ],
      },
      {
        title: 'Week 4: Mock interviews and the real environment',
        blocks: [
          {
            kind: 'p',
            text: 'The final week is about simulation. Do at least one timed mock interview daily — ideally in a shared editor where someone else watches your screen, because that mirrors the real thing. Use a whiteboard or a coding pad, not your favorite IDE with autocomplete. Record the session and replay it to catch bad habits like silent thinking or rushing into code.',
          },
          {
            kind: 'list',
            items: [
              '30 minutes per problem, timed on a visible clock',
              'Practice in the same tool you will use in the interview',
              'Review every failed solution and re-solve it within 48 hours',
              'Keep a running "mistake list" of the bugs you make most often',
            ],
          },
        ],
      },
      {
        title: 'The tools that help',
        blocks: [
          {
            kind: 'p',
            text: 'Consistency beats intensity. Ten focused days of pattern work, one week of verbalizing your thinking, and one week of timed simulations will take you further than a month of unfocused grinding. If you want a real-time assistant to practice with, Hirebotai\u2019s Practice Room runs timed mock sessions and scores your answers so you always know where you stand.',
          },
        ],
      },
    ],
  },
  {
    slug: 'big-o-notation-cheat-sheet',
    title: 'Big-O Notation Cheat Sheet: Time & Space Complexity',
    description:
      'Every time and space complexity you need for coding interviews, with examples and the growth rates you must recognize instantly.',
    date: '2026-07-15',
    readTime: '6 min read',
    category: 'Cheat Sheets',
    sections: [
      {
        title: 'The complexity tiers you must know',
        blocks: [
          {
            kind: 'p',
            text: 'Big-O describes how runtime grows with input size n. Interviewers rarely care about exact constants — they care that you can name the complexity class and justify it. These are the tiers to memorize:',
          },
          {
            kind: 'list',
            items: [
              'O(1) — constant: array lookup by index, hash map lookup',
              'O(log n) — logarithmic: binary search, balanced tree operations',
              'O(n) — linear: single pass over an array, linear scan',
              'O(n log n) — linearithmic: efficient sorts, divide-and-conquer merges',
              'O(n²) — quadratic: nested loops over the input',
              'O(2ⁿ) — exponential: recursion over subsets, naive Fibonacci',
              'O(n!) — factorial: permutations',
            ],
          },
        ],
      },
      {
        title: 'Recognizing complexity from code',
        blocks: [
          {
            kind: 'p',
            text: 'A fast way to estimate complexity: count the nested loops that depend on the input size. A single loop is O(n), two nested loops are O(n²). The moment you halve the search space each step, you are in O(log n) territory. Recursive calls that solve the full problem twice are the classic source of accidental O(2ⁿ).',
          },
          {
            kind: 'code',
            code: `// O(n): one pass
for (let i = 0; i < n; i++) total += arr[i];

// O(n²): nested dependent loops
for (let i = 0; i < n; i++)
  for (let j = i + 1; j < n; j++) pairs.push([i, j]);

// O(log n): halving the space each step
while (lo <= hi) {
  const mid = (lo + hi) >> 1;
  if (target === arr[mid]) return mid;
  target < arr[mid] ? (hi = mid - 1) : (lo = mid + 1);
}`,
          },
        ],
      },
      {
        title: 'Space complexity traps',
        blocks: [
          {
            kind: 'p',
            text: 'Space complexity is the extra memory your algorithm allocates, not the input itself. In-place algorithms use O(1) extra space. Watch out for these common traps:',
          },
          {
            kind: 'list',
            items: [
              'A recursive solution with depth n uses O(n) call stack space even if no arrays are allocated.',
              'Building an output array of size n is O(n) space — acceptable, but say so.',
              'Hash maps buy speed with space; the trade-off should always be mentioned.',
            ],
          },
        ],
      },
      {
        title: 'Saying it out loud in an interview',
        blocks: [
          {
            kind: 'p',
            text: 'Before you write a single line, say: "A brute force would be O(n²), but a hash map lets me drop lookup to O(1), giving O(n) time and O(n) space." Naming the trade-off out loud is often what separates a hire from a pass. Memorize this cheat sheet and you will never freeze on the complexity question again.',
          },
        ],
      },
    ],
  },
  {
    slug: 'system-design-interview-guide',
    title: 'System Design Interview: The Complete Practice Guide',
    description:
      'A repeatable framework for system design interviews: requirement gathering, capacity estimation, API design, data model, high-level architecture and bottlenecks.',
    date: '2026-06-20',
    readTime: '9 min read',
    category: 'Interview Prep',
    sections: [
      {
        title: 'The framework that never fails',
        blocks: [
          {
            kind: 'p',
            text: 'System design interviews are not a pop quiz on specific products — they are an evaluation of how you break down an open-ended problem. Interviewers reward a clear, repeatable structure over brilliant one-off ideas. Use this sequence every time:',
          },
          {
            kind: 'list',
            items: [
              'Clarify requirements and scope (features in vs. out)',
              'Estimate scale: QPS, storage, bandwidth',
              'Design the API surface',
              'Design the data model and storage choices',
              'Sketch the high-level architecture',
              'Identify bottlenecks and how to address them',
            ],
          },
        ],
      },
      {
        title: 'Capacity estimation without fear',
        blocks: [
          {
            kind: 'p',
            text: 'Interviewers do not expect exact numbers — they expect defensible math. A useful rule set: a single server handles a few thousand requests per second; a database in the tens of thousands of reads per second with caching; a CDN absorbs most read traffic. Estimate QPS by assuming 10% of daily active users are online at peak, and each performs a handful of requests.',
          },
          {
            kind: 'code',
            code: `// Quick estimate for a news feed
DAU = 10,000,000
peak_users = DAU * 0.10            // 1,000,000 concurrent
requests_per_user_per_day = 50
avg_qps = DAU * requests / 86,400  // ~5,800 req/s
peak_qps = avg_qps * 5             // ~29,000 req/s`,
          },
        ],
      },
      {
        title: 'Storage decisions',
        blocks: [
          {
            kind: 'p',
            text: 'Choose storage from the access pattern, not the trend. Relational databases win when data is strongly relational and queries are known ahead of time. A document store is comfortable for schemaless, nested content. A key-value store or cache shines for lookups at massive scale. Say your choice and justify it in one sentence.',
          },
          {
            kind: 'list',
            items: [
              'Relational (Postgres): transactions, joins, structured relational data',
              'Document (MongoDB): flexible schemas, nested objects, fast iteration',
              'Key-value / cache (Redis): hot reads, leaderboards, sessions',
              'Blob / object storage (S3): media, uploads, cold archives',
            ],
          },
        ],
      },
      {
        title: 'The bottlenecks that get you the offer',
        blocks: [
          {
            kind: 'p',
            text: 'The final phase of every answer is where candidates are separated: naming the two or three places the system breaks under load. Practice pointing at each one explicitly — "the database is the bottleneck, so I add a read cache and a write queue" — rather than listing generic scalability features.',
          },
          {
            kind: 'list',
            items: [
              'Database read pressure → add a cache layer, read replicas',
              'Write spikes → introduce an async queue and worker pool',
              'Single point of failure → replicate services across zones',
              'Hot partition on one key → shard by a high-cardinality field',
            ],
          },
        ],
      },
      {
        title: 'Practice makes the framework automatic',
        blocks: [
          {
            kind: 'p',
            text: 'Run the framework against ten classic questions — a URL shortener, a news feed, a chat system, a rate limiter, a notification service — until the structure comes automatically. Hiring teams want engineers who can reason from first principles. Rehearsed structure is exactly how you demonstrate that under time pressure.',
          },
        ],
      },
    ],
  },
];

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
