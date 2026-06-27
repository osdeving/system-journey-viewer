/**
 * Purpose: Define UI-only technology icon presets that can be attached to diagram nodes.
 */

import type { SimpleIcon } from 'simple-icons'
import {
  siAngular,
  siAnsible,
  siApachekafka,
  siApachemaven,
  siApachetomcat,
  siConsul,
  siDocker,
  siDotnet,
  siElasticsearch,
  siEnvoyproxy,
  siExpress,
  siFastapi,
  siGithub,
  siGitlab,
  siGo,
  siGooglecloud,
  siGradle,
  siGrafana,
  siHelm,
  siIstio,
  siJavascript,
  siJenkins,
  siKeycloak,
  siKubernetes,
  siLinux,
  siMongodb,
  siMysql,
  siNestjs,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siOpenjdk,
  siOpentelemetry,
  siPostgresql,
  siPrometheus,
  siPython,
  siQuarkus,
  siRabbitmq,
  siReact,
  siRedis,
  siRust,
  siSpringboot,
  siTerraform,
  siTypescript,
  siVite,
  siVuedotjs,
  siVault,
} from 'simple-icons'

export const TECH_ICON_DRAG_MIME_TYPE = 'application/x-sjv-tech-icon'

export type TechIconCategoryId =
  | 'languages'
  | 'frameworks'
  | 'data'
  | 'platform'
  | 'observability'
  | 'generic'

export type TechIconGlyph =
  | {
      type: 'simple'
      path: string
      fill: string
    }
  | {
      type: 'badge'
      label: string
      fill: string
      textColor: string
      stroke?: string
    }
  | {
      type: 'vector'
      paths: Array<{
        d: string
        fill?: string
        stroke?: string
        strokeWidth?: number
        strokeLinecap?: 'round' | 'square' | 'butt'
        strokeLinejoin?: 'round' | 'miter' | 'bevel'
      }>
    }

export interface TechIconDefinition {
  id: string
  label: string
  category: TechIconCategoryId
  source: 'simple-icons' | 'sjv'
  aliases: string[]
  glyph: TechIconGlyph
}

const fromSimpleIcon = (
  id: string,
  label: string,
  category: TechIconCategoryId,
  icon: SimpleIcon,
  aliases: string[] = [],
): TechIconDefinition => ({
  id,
  label,
  category,
  source: 'simple-icons',
  aliases: [icon.title, icon.slug, ...aliases],
  glyph: {
    type: 'simple',
    path: icon.path,
    fill: `#${icon.hex}`,
  },
})

const badgeIcon = (
  id: string,
  label: string,
  category: TechIconCategoryId,
  badgeLabel: string,
  fill: string,
  aliases: string[] = [],
): TechIconDefinition => ({
  id,
  label,
  category,
  source: 'sjv',
  aliases,
  glyph: {
    type: 'badge',
    label: badgeLabel,
    fill,
    textColor: '#ffffff',
    stroke: 'rgba(255,255,255,0.44)',
  },
})

const vectorIcon = (
  id: string,
  label: string,
  category: TechIconCategoryId,
  paths: TechIconGlyph & { type: 'vector' },
  aliases: string[] = [],
): TechIconDefinition => ({
  id,
  label,
  category,
  source: 'sjv',
  aliases,
  glyph: paths,
})

export const TECH_ICON_CATEGORY_LABELS: Record<TechIconCategoryId, string> = {
  languages: 'Languages',
  frameworks: 'Frameworks',
  data: 'Data',
  platform: 'Platform',
  observability: 'Observability',
  generic: 'Generic',
}

export const TECH_ICON_CATEGORY_ORDER: TechIconCategoryId[] = [
  'languages',
  'frameworks',
  'data',
  'platform',
  'observability',
  'generic',
]

export const techIconDefinitions: TechIconDefinition[] = [
  fromSimpleIcon('java', 'Java', 'languages', siOpenjdk, ['openjdk', 'jvm']),
  badgeIcon('csharp', 'C#', 'languages', 'C#', '#68217a', ['c sharp', 'dotnet']),
  fromSimpleIcon('dotnet', '.NET', 'languages', siDotnet, ['c#']),
  fromSimpleIcon('typescript', 'TypeScript', 'languages', siTypescript, ['ts']),
  fromSimpleIcon('javascript', 'JavaScript', 'languages', siJavascript, ['js']),
  fromSimpleIcon('nodejs', 'Node.js', 'languages', siNodedotjs, ['node']),
  fromSimpleIcon('python', 'Python', 'languages', siPython),
  fromSimpleIcon('go', 'Go', 'languages', siGo, ['golang']),
  fromSimpleIcon('rust', 'Rust', 'languages', siRust),
  fromSimpleIcon('spring-boot', 'Spring Boot', 'frameworks', siSpringboot, ['spring']),
  fromSimpleIcon('quarkus', 'Quarkus', 'frameworks', siQuarkus),
  fromSimpleIcon('react', 'React', 'frameworks', siReact),
  fromSimpleIcon('angular', 'Angular', 'frameworks', siAngular),
  fromSimpleIcon('vue', 'Vue.js', 'frameworks', siVuedotjs, ['vue']),
  fromSimpleIcon('nextjs', 'Next.js', 'frameworks', siNextdotjs, ['next']),
  fromSimpleIcon('nestjs', 'NestJS', 'frameworks', siNestjs, ['nest']),
  fromSimpleIcon('express', 'Express', 'frameworks', siExpress),
  fromSimpleIcon('fastapi', 'FastAPI', 'frameworks', siFastapi),
  fromSimpleIcon('vite', 'Vite', 'frameworks', siVite),
  fromSimpleIcon('redis', 'Redis', 'data', siRedis, ['cache']),
  fromSimpleIcon('kafka', 'Apache Kafka', 'data', siApachekafka, ['event hub', 'topic']),
  fromSimpleIcon('rabbitmq', 'RabbitMQ', 'data', siRabbitmq, ['queue']),
  fromSimpleIcon('postgres', 'PostgreSQL', 'data', siPostgresql, ['postgres']),
  fromSimpleIcon('mysql', 'MySQL', 'data', siMysql),
  fromSimpleIcon('mongodb', 'MongoDB', 'data', siMongodb, ['mongo']),
  fromSimpleIcon('elasticsearch', 'Elasticsearch', 'data', siElasticsearch, ['elastic']),
  fromSimpleIcon('docker', 'Docker', 'platform', siDocker, ['container']),
  fromSimpleIcon('kubernetes', 'Kubernetes', 'platform', siKubernetes, ['k8s']),
  fromSimpleIcon('nginx', 'NGINX', 'platform', siNginx, ['gateway', 'reverse proxy']),
  fromSimpleIcon('linux', 'Linux', 'platform', siLinux),
  fromSimpleIcon('terraform', 'Terraform', 'platform', siTerraform),
  fromSimpleIcon('ansible', 'Ansible', 'platform', siAnsible),
  fromSimpleIcon('helm', 'Helm', 'platform', siHelm),
  fromSimpleIcon('istio', 'Istio', 'platform', siIstio),
  fromSimpleIcon('envoy', 'Envoy Proxy', 'platform', siEnvoyproxy, ['proxy']),
  fromSimpleIcon('vault', 'Vault', 'platform', siVault, ['secrets']),
  fromSimpleIcon('consul', 'Consul', 'platform', siConsul),
  fromSimpleIcon('google-cloud', 'Google Cloud', 'platform', siGooglecloud, ['gcp']),
  fromSimpleIcon('github', 'GitHub', 'platform', siGithub),
  fromSimpleIcon('gitlab', 'GitLab', 'platform', siGitlab),
  fromSimpleIcon('jenkins', 'Jenkins', 'platform', siJenkins, ['ci']),
  fromSimpleIcon('maven', 'Apache Maven', 'platform', siApachemaven, ['mvn']),
  fromSimpleIcon('gradle', 'Gradle', 'platform', siGradle),
  fromSimpleIcon('tomcat', 'Apache Tomcat', 'platform', siApachetomcat),
  fromSimpleIcon('grafana', 'Grafana', 'observability', siGrafana),
  fromSimpleIcon('prometheus', 'Prometheus', 'observability', siPrometheus),
  fromSimpleIcon('opentelemetry', 'OpenTelemetry', 'observability', siOpentelemetry, ['otel']),
  fromSimpleIcon('keycloak', 'Keycloak', 'observability', siKeycloak, ['identity', 'iam']),
  vectorIcon(
    'generic-container',
    'Container',
    'generic',
    {
      type: 'vector',
      paths: [
        { d: 'M4 8.2h16v9.3H4z', fill: '#0f766e' },
        { d: 'M6.4 5h11.2v3.2H6.4z', fill: '#14b8a6' },
        { d: 'M7 11h2.4M10.8 11h2.4M14.6 11H17M7 14.4h2.4M10.8 14.4h2.4M14.6 14.4H17', stroke: '#ccfbf1', strokeWidth: 1.3, strokeLinecap: 'round' },
      ],
    },
    ['container', 'runtime'],
  ),
  vectorIcon(
    'generic-component',
    'Component',
    'generic',
    {
      type: 'vector',
      paths: [
        { d: 'M8 4h8l4 4v8l-4 4H8l-4-4V8z', fill: '#2563eb' },
        { d: 'M8.2 9h7.6v6H8.2zM4.8 10.2H8M16 10.2h3.2M4.8 13.8H8M16 13.8h3.2', stroke: '#dbeafe', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' },
      ],
    },
    ['component', 'module'],
  ),
  vectorIcon(
    'generic-boundary',
    'Boundary',
    'generic',
    {
      type: 'vector',
      paths: [
        { d: 'M4.2 6.5h15.6v11H4.2z', fill: '#475569' },
        { d: 'M7 9.2h10M7 12h10M7 14.8h6', stroke: '#e2e8f0', strokeWidth: 1.2, strokeLinecap: 'round' },
        { d: 'M4.2 6.5h15.6v11H4.2z', stroke: '#f8fafc', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      ],
    },
    ['boundary', 'context'],
  ),
  vectorIcon(
    'generic-service',
    'Service',
    'generic',
    {
      type: 'vector',
      paths: [
        { d: 'M12 3.8l7.1 4.1v8.2L12 20.2l-7.1-4.1V7.9z', fill: '#7c3aed' },
        { d: 'M8.7 10.4h6.6M8.7 13.6h6.6M12 7.7v8.6', stroke: '#ede9fe', strokeWidth: 1.35, strokeLinecap: 'round' },
      ],
    },
    ['service', 'microservice'],
  ),
  vectorIcon(
    'generic-database',
    'Database',
    'generic',
    {
      type: 'vector',
      paths: [
        { d: 'M5 7.5c0-2 3.1-3.6 7-3.6s7 1.6 7 3.6v9c0 2-3.1 3.6-7 3.6s-7-1.6-7-3.6z', fill: '#0ea5e9' },
        { d: 'M5 7.5c0 2 3.1 3.6 7 3.6s7-1.6 7-3.6M5 12c0 2 3.1 3.6 7 3.6s7-1.6 7-3.6', stroke: '#e0f2fe', strokeWidth: 1.25, strokeLinecap: 'round' },
      ],
    },
    ['database', 'db'],
  ),
  vectorIcon(
    'generic-queue',
    'Queue',
    'generic',
    {
      type: 'vector',
      paths: [
        { d: 'M4.2 7h11.6a4.2 4.2 0 010 8.4H4.2z', fill: '#f59e0b' },
        { d: 'M8 10.1h7.4M8 12.5h5.1M16.4 8.6l3 2.6-3 2.6', stroke: '#fff7ed', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' },
      ],
    },
    ['queue', 'topic', 'broker'],
  ),
]

const techIconDefinitionById = new Map(techIconDefinitions.map((icon) => [icon.id, icon]))

export const resolveTechIconDefinition = (iconId: string): TechIconDefinition | undefined =>
  techIconDefinitionById.get(iconId)

