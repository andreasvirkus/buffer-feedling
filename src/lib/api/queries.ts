export const ACCOUNT_QUERY = /* GraphQL */ `
  query Account {
    account {
      name
      email
      organizations {
        id
      }
    }
  }
`;

// One request per poll: the API allows ~100 requests per 15 min
export const POLL_QUERY = /* GraphQL */ `
  query Poll($org: OrganizationId!, $sentSince: DateTime!, $createdSince: DateTime!) {
    channels(input: { organizationId: $org }) {
      service
      isDisconnected
      postingGoal {
        goal
        sentCount
        scheduledCount
      }
    }
    sent: posts(
      first: 50
      input: {
        organizationId: $org
        filter: { status: [sent], dueAt: { start: $sentSince } }
        sort: [{ field: dueAt, direction: desc }]
      }
    ) {
      edges {
        node {
          sentAt
        }
      }
    }
    recent: posts(
      first: 50
      input: {
        organizationId: $org
        filter: { createdAt: { start: $createdSince } }
        sort: [{ field: createdAt, direction: desc }]
      }
    ) {
      edges {
        node {
          status
          createdAt
        }
      }
    }
    scheduled: posts(
      first: 50
      input: { organizationId: $org, filter: { status: [scheduled] }, sort: [{ field: dueAt, direction: asc }] }
    ) {
      edges {
        node {
          id
          dueAt
        }
      }
    }
    lastSent: posts(
      first: 1
      input: { organizationId: $org, filter: { status: [sent] }, sort: [{ field: dueAt, direction: desc }] }
    ) {
      edges {
        node {
          sentAt
        }
      }
    }
    ideas(first: 20, input: { organizationId: $org }) {
      edges {
        node {
          createdAt
        }
      }
    }
  }
`;
