// Every service from the brief. `filter` scopes a shared status feed to one
// product/component. `live: false` means the browser can't fetch it (no CORS),
// so the site shows the build-time snapshot for that card.

const sp = (url, filter, live = true) => ({ type: 'statuspage', url, filter, live });

export const CATEGORIES = [
  'Cloud Providers',
  'CI/CD',
  'Source Code Repositories',
  'Hosted Databases',
  'CDN and DNS',
  'LLMs and AI Assistants',
  'Observability and Monitoring',
  'Artifact Repositories',
  'SMTP Providers',
  'Payment Gateways',
  'Other Status Pages',
];

export const SERVICES = [
  // Cloud Providers
  { id: 'azure', name: 'Microsoft Azure', category: 'Cloud Providers', url: 'https://status.azure.com/en-us/status', source: { type: 'azure', url: 'https://azure.status.microsoft/en-us/status/feed/', live: false } },
  { id: 'gcp', name: 'Google Cloud Platform', category: 'Cloud Providers', url: 'https://status.cloud.google.com/', source: { type: 'gcp', url: 'https://status.cloud.google.com/incidents.json' } },
  { id: 'aws', name: 'Amazon Web Services', category: 'Cloud Providers', url: 'https://health.aws.amazon.com/health/status', source: { type: 'aws', url: 'https://status.aws.amazon.com/rss/all.rss' } },
  { id: 'digitalocean', name: 'DigitalOcean', category: 'Cloud Providers', url: 'https://status.digitalocean.com/', source: sp('https://status.digitalocean.com/api/v2/summary.json') },
  { id: 'hetzner', name: 'Hetzner', category: 'Cloud Providers', url: 'https://status.hetzner.com/', source: { type: 'hetzner', url: 'https://status.hetzner.com/', live: false } },
  { id: 'fly', name: 'Fly.io', category: 'Cloud Providers', url: 'https://status.flyio.net/', source: sp('https://status.flyio.net/api/v2/summary.json') },
  { id: 'render', name: 'Render', category: 'Cloud Providers', url: 'https://status.render.com/', source: sp('https://status.render.com/api/v2/summary.json') },
  { id: 'railway', name: 'Railway', category: 'Cloud Providers', url: 'https://railway.statuspage.io/', source: sp('https://railway.statuspage.io/api/v2/summary.json') },
  { id: 'linode', name: 'Linode', category: 'Cloud Providers', url: 'https://status.linode.com/', source: sp('https://status.linode.com/api/v2/summary.json') },
  { id: 'vercel', name: 'Vercel', category: 'Cloud Providers', url: 'https://www.vercel-status.com/', source: sp('https://www.vercel-status.com/api/v2/summary.json') },
  { id: 'netlify', name: 'Netlify', category: 'Cloud Providers', url: 'https://www.netlifystatus.com/', source: sp('https://status.netlify.com/api/v2/summary.json') },
  { id: 'cloudflare-host', name: 'Cloudflare', category: 'Cloud Providers', url: 'https://www.cloudflarestatus.com/', source: sp('https://www.cloudflarestatus.com/api/v2/summary.json', null, false) },

  // CI/CD
  { id: 'github-actions', name: 'GitHub Actions', category: 'CI/CD', url: 'https://www.githubstatus.com/', source: sp('https://www.githubstatus.com/api/v2/summary.json', 'actions') },
  { id: 'jenkins', name: 'Jenkins', category: 'CI/CD', url: 'https://www.jenkins.io/', source: { type: 'none' } },
  { id: 'circleci', name: 'CircleCI', category: 'CI/CD', url: 'https://status.circleci.com/', source: sp('https://status.circleci.com/api/v2/summary.json') },
  { id: 'gitlab-ci', name: 'GitLab CI', category: 'CI/CD', url: 'https://status.gitlab.com/', source: { type: 'none' } },
  { id: 'travis', name: 'Travis CI', category: 'CI/CD', url: 'https://www.travis-ci.com/', source: { type: 'none' } },

  // Source Code Repositories
  { id: 'github', name: 'GitHub', category: 'Source Code Repositories', url: 'https://www.githubstatus.com/', source: sp('https://www.githubstatus.com/api/v2/summary.json') },
  { id: 'gitlab', name: 'GitLab', category: 'Source Code Repositories', url: 'https://status.gitlab.com/', source: { type: 'none' } },
  { id: 'bitbucket', name: 'Bitbucket', category: 'Source Code Repositories', url: 'https://bitbucket.status.atlassian.com/', source: sp('https://bitbucket.status.atlassian.com/api/v2/summary.json') },
  { id: 'ghe', name: 'GitHub Enterprise', category: 'Source Code Repositories', url: 'https://www.githubstatus.com/', source: sp('https://www.githubstatus.com/api/v2/summary.json', 'enterprise') },

  // Hosted Databases
  { id: 'mongodb', name: 'MongoDB Atlas', category: 'Hosted Databases', url: 'https://status.mongodb.com/', source: sp('https://status.mongodb.com/api/v2/summary.json', 'atlas') },
  { id: 'aws-rds', name: 'AWS RDS', category: 'Hosted Databases', url: 'https://health.aws.amazon.com/health/status', source: { type: 'aws', url: 'https://status.aws.amazon.com/rss/all.rss', filter: 'RDS|Relational Database' } },
  { id: 'gcp-sql', name: 'Google Cloud SQL for PostgreSQL', category: 'Hosted Databases', url: 'https://status.cloud.google.com/', source: { type: 'gcp', url: 'https://status.cloud.google.com/incidents.json', filter: 'Cloud SQL|SQL' } },
  { id: 'azure-sql', name: 'Azure SQL Managed Instance', category: 'Hosted Databases', url: 'https://status.azure.com/en-us/status', source: { type: 'azure', url: 'https://azure.status.microsoft/en-us/status/feed/', filter: 'SQL', live: false } },
  { id: 'planetscale', name: 'PlanetScale', category: 'Hosted Databases', url: 'https://planetscale.statuspage.io/', source: sp('https://planetscale.statuspage.io/api/v2/summary.json') },
  { id: 'supabase', name: 'Supabase', category: 'Hosted Databases', url: 'https://status.supabase.com/', source: sp('https://status.supabase.com/api/v2/summary.json') },
  { id: 'render-pg', name: 'Render PostgreSQL', category: 'Hosted Databases', url: 'https://status.render.com/', source: sp('https://status.render.com/api/v2/summary.json', 'postgres') },

  // CDN and DNS
  { id: 'cf-dns', name: 'Cloudflare DNS', category: 'CDN and DNS', url: 'https://www.cloudflarestatus.com/', source: sp('https://www.cloudflarestatus.com/api/v2/summary.json', 'DNS', false) },
  { id: 'akamai', name: 'Akamai', category: 'CDN and DNS', url: 'https://www.akamaistatus.com/', source: sp('https://status.akamai.com/api/v2/summary.json') },
  { id: 'cf-cdn', name: 'Cloudflare CDN', category: 'CDN and DNS', url: 'https://www.cloudflarestatus.com/', source: sp('https://www.cloudflarestatus.com/api/v2/summary.json', 'CDN', false) },
  { id: 'fastly', name: 'Fastly', category: 'CDN and DNS', url: 'https://status.fastly.com/', source: { type: 'none' } },
  { id: 'cloudfront', name: 'AWS CloudFront', category: 'CDN and DNS', url: 'https://health.aws.amazon.com/health/status', source: { type: 'aws', url: 'https://status.aws.amazon.com/rss/all.rss', filter: 'CloudFront' } },
  { id: 'route53', name: 'AWS Route 53', category: 'CDN and DNS', url: 'https://health.aws.amazon.com/health/status', source: { type: 'aws', url: 'https://status.aws.amazon.com/rss/all.rss', filter: 'Route 53' } },
  { id: 'gcp-dns', name: 'Google Cloud DNS', category: 'CDN and DNS', url: 'https://status.cloud.google.com/', source: { type: 'gcp', url: 'https://status.cloud.google.com/incidents.json', filter: 'Cloud DNS' } },

  // LLMs and AI Assistants
  { id: 'cursor', name: 'Cursor', category: 'LLMs and AI Assistants', url: 'https://status.cursor.com/', source: sp('https://status.cursor.com/api/v2/summary.json') },
  { id: 'claude', name: 'Claude', category: 'LLMs and AI Assistants', url: 'https://status.claude.com/', source: sp('https://status.anthropic.com/api/v2/summary.json') },
  { id: 'copilot', name: 'Copilot', category: 'LLMs and AI Assistants', url: 'https://www.githubstatus.com/', source: sp('https://www.githubstatus.com/api/v2/summary.json', 'copilot') },
  { id: 'huggingface', name: 'HuggingFace', category: 'LLMs and AI Assistants', url: 'https://status.huggingface.co/', source: { type: 'none' } },

  // Observability and Monitoring
  { id: 'pagerduty', name: 'PagerDuty', category: 'Observability and Monitoring', url: 'https://status.pagerduty.com/', source: { type: 'none' } },
  { id: 'betterstack', name: 'BetterStack', category: 'Observability and Monitoring', url: 'https://status.betterstack.com/', source: { type: 'none' } },
  { id: 'newrelic', name: 'New Relic', category: 'Observability and Monitoring', url: 'https://status.newrelic.com/', source: sp('https://status.newrelic.com/api/v2/summary.json') },
  { id: 'datadog', name: 'Datadog', category: 'Observability and Monitoring', url: 'https://status.datadoghq.com/', source: { type: 'none' } },
  { id: 'grafana', name: 'Grafana Cloud', category: 'Observability and Monitoring', url: 'https://status.grafana.com/', source: sp('https://status.grafana.com/api/v2/summary.json') },
  { id: 'honeycomb', name: 'Honeycomb', category: 'Observability and Monitoring', url: 'https://status.honeycomb.io/', source: sp('https://status.honeycomb.io/api/v2/summary.json') },
  { id: 'solarwinds', name: 'SolarWinds', category: 'Observability and Monitoring', url: 'https://status.solarwinds.com/', source: { type: 'none' } },

  // Artifact Repositories
  { id: 'dockerhub', name: 'DockerHub', category: 'Artifact Repositories', url: 'https://status.docker.com/', source: { type: 'none' } },
  { id: 'gcr', name: 'Google Container Registry', category: 'Artifact Repositories', url: 'https://status.cloud.google.com/', source: { type: 'gcp', url: 'https://status.cloud.google.com/incidents.json', filter: 'Container Registry|Artifact Registry' } },
  { id: 'quay', name: 'Red Hat Quay', category: 'Artifact Repositories', url: 'https://status.redhat.com/', source: sp('https://status.redhat.com/api/v2/summary.json', 'quay') },
  { id: 'ghcr', name: 'GitHub Container Registry', category: 'Artifact Repositories', url: 'https://www.githubstatus.com/', source: sp('https://www.githubstatus.com/api/v2/summary.json', 'container registry') },
  { id: 'npm', name: 'npm', category: 'Artifact Repositories', url: 'https://status.npmjs.org/', source: sp('https://status.npmjs.org/api/v2/summary.json') },

  // SMTP Providers
  { id: 'sendgrid', name: 'SendGrid', category: 'SMTP Providers', url: 'https://status.twilio.com/', source: sp('https://status.sendgrid.com/api/v2/summary.json', 'sendgrid') },
  { id: 'smtpcom', name: 'SMTP.com', category: 'SMTP Providers', url: 'https://www.smtp.com/', source: { type: 'none' } },
  { id: 'mailersend', name: 'MailerSend', category: 'SMTP Providers', url: 'https://status.mailersend.com/', source: sp('https://status.mailersend.com/api/v2/summary.json') },

  // Payment Gateways
  { id: 'stripe', name: 'Stripe', category: 'Payment Gateways', url: 'https://status.stripe.com/', source: { type: 'atom', url: 'https://status.stripe.com/current/atom.xml', live: false } },
  { id: 'paypal', name: 'PayPal', category: 'Payment Gateways', url: 'https://www.paypal-status.com/product/production', source: { type: 'rss', url: 'https://www.paypal-status.com/feed/rss', live: false } },
  { id: 'dodo', name: 'DodoPayments', category: 'Payment Gateways', url: 'https://status.dodopayments.com/', source: { type: 'dodo', url: 'https://status.dodopayments.com/api/status' } },

  // Other Status Pages
  { id: 'acquia', name: 'Acquia', category: 'Other Status Pages', url: 'https://status.acquia.com/', source: sp('https://status.acquia.com/api/v2/summary.json') },
  { id: 'activecampaign', name: 'ActiveCampaign', category: 'Other Status Pages', url: 'https://status.activecampaign.com/', source: sp('https://status.activecampaign.com/api/v2/summary.json') },
  { id: 'adobe', name: 'Adobe', category: 'Other Status Pages', url: 'https://status.adobe.com/', source: { type: 'none' } },
  { id: 'apple', name: 'Apple System Status', category: 'Other Status Pages', url: 'https://www.apple.com/support/systemstatus/', source: { type: 'apple', url: 'https://www.apple.com/support/systemstatus/data/system_status_en_US.js', live: false } },
  { id: 'automattic', name: 'Automattic', category: 'Other Status Pages', url: 'https://status.wordpress.com/', source: { type: 'none' } },
  { id: 'beanstalk', name: 'Beanstalk', category: 'Other Status Pages', url: 'https://www.beanstalkapp.com/', source: { type: 'none' } },
  { id: 'blackboard', name: 'Blackboard', category: 'Other Status Pages', url: 'https://status.blackboard.com/', source: sp('https://status.blackboard.com/api/v2/summary.json') },
  { id: 'box', name: 'Box', category: 'Other Status Pages', url: 'https://status.box.com/', source: sp('https://status.box.com/api/v2/summary.json') },
  { id: 'sharefile', name: 'Citrix ShareFile', category: 'Other Status Pages', url: 'https://status.sharefile.com/', source: sp('https://status.sharefile.com/api/v2/summary.json') },
  { id: 'dediserve', name: 'dediserve', category: 'Other Status Pages', url: 'https://status.dediserve.com/', source: { type: 'none' } },
  { id: 'fedora', name: 'Fedora Infrastructure', category: 'Other Status Pages', url: 'https://status.fedoraproject.org/', source: { type: 'none' } },
  { id: 'gandi', name: 'Gandi.net', category: 'Other Status Pages', url: 'https://status.gandi.net/', source: sp('https://status.gandi.net/api/v2/summary.json') },
  { id: 'garmin', name: 'Garmin Connect', category: 'Other Status Pages', url: 'https://connect.garmin.com/', source: { type: 'none' } },
  { id: 'googleapps', name: 'Google Workspace Status', category: 'Other Status Pages', url: 'https://www.google.com/appsstatus/dashboard/', source: { type: 'none' } },
  { id: 'goto', name: 'Citrix GoToMeeting', category: 'Other Status Pages', url: 'https://status.goto.com/', source: sp('https://status.goto.com/api/v2/summary.json') },
  { id: 'heroku', name: 'Heroku', category: 'Other Status Pages', url: 'https://status.heroku.com/', source: { type: 'heroku', url: 'https://status.heroku.com/api/v3/current-status', live: false } },
  { id: 'hirez', name: 'HiRez Studios', category: 'Other Status Pages', url: 'https://status.hirezstudios.com/', source: { type: 'none' } },
  { id: 'hipchat', name: 'HipChat', category: 'Other Status Pages', url: 'https://www.hipchat.com/', source: { type: 'none' } },
  { id: 'intercom', name: 'Intercom', category: 'Other Status Pages', url: 'https://status.intercom.com/', source: { type: 'none' } },
  { id: 'kickstarter', name: 'Kickstarter', category: 'Other Status Pages', url: 'https://status.kickstarter.com/', source: sp('https://status.kickstarter.com/api/v2/summary.json') },
  { id: 'lol', name: 'League of Legends', category: 'Other Status Pages', url: 'https://status.leagueoflegends.com/', source: { type: 'none' } },
  { id: 'mediatemple', name: 'Media Temple', category: 'Other Status Pages', url: 'https://mediatemple.net/', source: { type: 'none' } },
  { id: 'xbox', name: 'Xbox Live', category: 'Other Status Pages', url: 'https://support.xbox.com/en-US/xbox-live-status', source: sp('https://xboxlive.statuspage.io/api/v2/summary.json') },
  { id: 'nest', name: 'Nest', category: 'Other Status Pages', url: 'https://status.nest.com/', source: { type: 'none' } },
  { id: 'ovh', name: 'OVH', category: 'Other Status Pages', url: 'https://status.ovhcloud.com/', source: { type: 'none' } },
  { id: 'parse', name: 'Parse', category: 'Other Status Pages', url: 'https://parseplatform.org/', source: { type: 'none' } },
  { id: 'pivotaltracker', name: 'Pivotal Tracker', category: 'Other Status Pages', url: 'https://www.pivotaltracker.com/', source: { type: 'none' } },
  { id: 'pivotalws', name: 'Pivotal Web Services', category: 'Other Status Pages', url: 'https://run.pivotal.io/', source: { type: 'none' } },
  { id: 'playstation', name: 'PlayStation Network', category: 'Other Status Pages', url: 'https://status.playstation.com/', source: { type: 'none' } },
  { id: 'rackspace', name: 'Rackspace', category: 'Other Status Pages', url: 'https://status.rackspace.com/', source: { type: 'none' } },
  { id: 'shopify', name: 'Shopify', category: 'Other Status Pages', url: 'https://www.shopifystatus.com/', source: sp('https://status.shopify.com/api/v2/summary.json') },
  { id: 'site5', name: 'site5', category: 'Other Status Pages', url: 'https://www.site5.com/', source: { type: 'none' } },
  { id: 'slack', name: 'Slack', category: 'Other Status Pages', url: 'https://slack-status.com/', source: { type: 'none' } },
  { id: 'statuspage-meta', name: 'Statuspage.io Meta', category: 'Other Status Pages', url: 'https://status.statuspage.io/', source: { type: 'none' } },
  { id: 'sumologic', name: 'Sumo Logic', category: 'Other Status Pages', url: 'https://status.sumologic.com/', source: sp('https://status.sumologic.com/api/v2/summary.json') },
  { id: 'swift', name: 'Swift', category: 'Other Status Pages', url: 'https://swift.org/', source: { type: 'none' } },
  { id: 'twitterdev', name: 'Twitter for Developers', category: 'Other Status Pages', url: 'https://developer.x.com/en/', source: { type: 'none' } },
  { id: 'edgecast', name: 'Verizon Edgecast', category: 'Other Status Pages', url: 'https://status.edgecast.com/', source: { type: 'none' } },
  { id: 'voxmedia', name: 'Vox Media', category: 'Other Status Pages', url: 'https://status.voxmedia.com/', source: { type: 'none' } },
  { id: 'wistia', name: 'Wistia', category: 'Other Status Pages', url: 'https://status.wistia.com/', source: { type: 'simple', url: 'https://status.wistia.com/api/v2/summary.json' } },
  { id: 'wow', name: 'World of WarCraft Realms', category: 'Other Status Pages', url: 'https://worldofwarcraft.blizzard.com/en-us/game/status', source: { type: 'none' } },
];

const assign = (weight, ids) => Object.fromEntries(ids.split(' ').map((id) => [id, weight]));

// Impact weight: S=1 M=2 L=3 XL=4 XXL=5. Small toys do not outrank GCP.
export const WEIGHTS = {
  ...assign('XXL', 'aws gcp azure cloudflare-host cf-dns cf-cdn'),
  ...assign('XL', 'digitalocean vercel netlify linode hetzner fly render railway github gitlab bitbucket github-actions npm dockerhub datadog newrelic grafana pagerduty sendgrid stripe paypal akamai fastly cloudfront route53 shopify slack heroku box'),
  ...assign('L', 'circleci mongodb supabase planetscale aws-rds gcp-sql azure-sql render-pg huggingface honeycomb betterstack quay ghcr gcr mailersend activecampaign blackboard gandi goto intercom kickstarter sumologic apple adobe wistia xbox ovh rackspace'),
  ...assign('S', 'travis jenkins gitlab-ci smtpcom solarwinds dodo acquia beanstalk dediserve fedora garmin googleapps hirez hipchat lol mediatemple nest parse pivotaltracker pivotalws playstation site5 statuspage-meta swift twitterdev edgecast voxmedia wow'),
};
