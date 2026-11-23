// Round 65: motion and service marks for Basalt's diagrams (DECISIONS 292, the handoff 287 to 291, the answers 293). A heavy council round decided on the
// owner's confirmed prototype and Neon's review (Fable decided, revised after Neon's final position). Built by Opus from the decision, then reviewed (Neon on the
// code, Fable on the pixels) and fixed once; the fixes have not been reviewed again, and the tests were written but not run (the owner skipped test work). The content is CIMIP's five diagrams, animated, and the kit ("How a change
// reaches production"), which carries nine brands' marks (Jenkins, BlazeMeter and ServiceNow unofficial, DECISIONS 297), and a sheet of every bundled mark on every ground.
//
// A still of motion is a pose: in a shot (?shot=1) the demo lets the motion run, then pauses the figure's own animations at a chosen point (the entrance part-way,
// the bead on a line, the dot mid-leg, a card in its arrival step) and marks the figure posed, so the shot is the same each time. Opened as the owner opens it, the
// walkthrough poses nothing: every figure plays, loops and pauses as it would in an app. Media states (reduced motion, forced colours, more contrast, print) are the
// build's own emulations.

import * as React from "react";

import { ArchitectureDiagram, DataFlowDiagram, FlowchartDiagram, SchemaDiagram, SequenceDiagram } from "../../packages/react/src/index";
import type { DiagramMark } from "../../packages/react/src/index";
import still from "../../packages/react/test/fixtures/cimip-diagrams.json";
import motion from "../../packages/react/test/fixtures/diagram-motion.json";
import type { Round } from "./rounds";
import { awsApplicationLoadBalancer } from "../../packages/react/src/marks/aws-application-load-balancer";
import { awsNetworkLoadBalancer } from "../../packages/react/src/marks/aws-network-load-balancer";
import { awsCloudfrontDistribution } from "../../packages/react/src/marks/aws-cloudfront-distribution";
import { awsRoute53HostedZone } from "../../packages/react/src/marks/aws-route-53-hosted-zone";
import { awsApiGatewayEndpoint } from "../../packages/react/src/marks/aws-api-gateway-endpoint";
import { awsInternetGateway } from "../../packages/react/src/marks/aws-internet-gateway";
import { awsNatGateway } from "../../packages/react/src/marks/aws-nat-gateway";
import { awsEcsService } from "../../packages/react/src/marks/aws-ecs-service";
import { awsEcsTask } from "../../packages/react/src/marks/aws-ecs-task";
import { awsEcrRegistry } from "../../packages/react/src/marks/aws-ecr-registry";
import { awsEc2Instance } from "../../packages/react/src/marks/aws-ec2-instance";
import { awsLambdaFunction } from "../../packages/react/src/marks/aws-lambda-function";
import { awsS3Bucket } from "../../packages/react/src/marks/aws-s3-bucket";
import { awsDynamodbTable } from "../../packages/react/src/marks/aws-dynamodb-table";
import { awsSqsQueue } from "../../packages/react/src/marks/aws-sqs-queue";
import { awsEventbridgeEventBus } from "../../packages/react/src/marks/aws-eventbridge-event-bus";
import { awsCloudwatchLogs } from "../../packages/react/src/marks/aws-cloudwatch-logs";
import { awsCloudwatchAlarm } from "../../packages/react/src/marks/aws-cloudwatch-alarm";
import { awsParameterStore } from "../../packages/react/src/marks/aws-parameter-store";
import { awsIamRole } from "../../packages/react/src/marks/aws-iam-role";
import { awsSagemakerModel } from "../../packages/react/src/marks/aws-sagemaker-model";
import { awsBedrock } from "../../packages/react/src/marks/aws-bedrock";
import { awsClient } from "../../packages/react/src/marks/aws-client";
import { awsMobileClient } from "../../packages/react/src/marks/aws-mobile-client";
import { awsUser } from "../../packages/react/src/marks/aws-user";
import { awsUsers } from "../../packages/react/src/marks/aws-users";
import { awsInternet } from "../../packages/react/src/marks/aws-internet";
import { awsServer } from "../../packages/react/src/marks/aws-server";
import { awsDatabase } from "../../packages/react/src/marks/aws-database";
import { awsApplication } from "../../packages/react/src/marks/aws-application";
import { awsGitRepository } from "../../packages/react/src/marks/aws-git-repository";
import { awsEmail } from "../../packages/react/src/marks/aws-email";
import { temporal } from "../../packages/react/src/marks/temporal";
import { sonarqube } from "../../packages/react/src/marks/sonarqube";
import { github } from "../../packages/react/src/marks/github";
import { coderabbit } from "../../packages/react/src/marks/coderabbit";
import { greptile } from "../../packages/react/src/marks/greptile";
import { blacksmith } from "../../packages/react/src/marks/blacksmith";
import { jenkins } from "../../packages/react/src/marks/jenkins";
import { servicenow } from "../../packages/react/src/marks/servicenow";
import { blazemeter } from "../../packages/react/src/marks/blazemeter";
import { awsVpc } from "../../packages/react/src/marks/aws-vpc";
import { awsVpcEndpoints } from "../../packages/react/src/marks/aws-vpc-endpoints";
import { awsVpnConnection } from "../../packages/react/src/marks/aws-vpn-connection";
import { awsTransitGatewayAttachment } from "../../packages/react/src/marks/aws-transit-gateway-attachment";
import { awsDirectConnectGateway } from "../../packages/react/src/marks/aws-direct-connect-gateway";
import { awsAppMeshMesh } from "../../packages/react/src/marks/aws-app-mesh-mesh";
import { awsGlueDataCatalog } from "../../packages/react/src/marks/aws-glue-data-catalog";
import { awsAthenaDataSourceConnectors } from "../../packages/react/src/marks/aws-athena-data-source-connectors";
import { awsEmrCluster } from "../../packages/react/src/marks/aws-emr-cluster";
import { awsLakeFormationDataLake } from "../../packages/react/src/marks/aws-lake-formation-data-lake";
import { awsOpensearchDataNode } from "../../packages/react/src/marks/aws-opensearch-data-node";
import { awsMskConnect } from "../../packages/react/src/marks/aws-msk-connect";
import { awsEventbridgeScheduler } from "../../packages/react/src/marks/aws-eventbridge-scheduler";
import { awsEventbridgePipes } from "../../packages/react/src/marks/aws-eventbridge-pipes";
import { awsDynamodbAccelerator } from "../../packages/react/src/marks/aws-dynamodb-accelerator";
import { awsCloudformationStack } from "../../packages/react/src/marks/aws-cloudformation-stack";
import { awsCloudtrailLake } from "../../packages/react/src/marks/aws-cloudtrail-lake";
import { awsOrganizationsAccount } from "../../packages/react/src/marks/aws-organizations-account";
import { awsSesEmail } from "../../packages/react/src/marks/aws-ses-email";
import { awsMqBroker } from "../../packages/react/src/marks/aws-mq-broker";
import { awsWafRule } from "../../packages/react/src/marks/aws-waf-rule";
import { awsShieldAdvanced } from "../../packages/react/src/marks/aws-shield-advanced";
import { awsSecurityHubFinding } from "../../packages/react/src/marks/aws-security-hub-finding";
import { awsInspectorAgent } from "../../packages/react/src/marks/aws-inspector-agent";
import { awsNetworkFirewallEndpoints } from "../../packages/react/src/marks/aws-network-firewall-endpoints";
import { awsDocumentdbElasticClusters } from "../../packages/react/src/marks/aws-documentdb-elastic-clusters";
import { awsDmsMigrationJob } from "../../packages/react/src/marks/aws-dms-migration-job";
import { awsRekognitionImage } from "../../packages/react/src/marks/aws-rekognition-image";
import { awsDatasyncAgent } from "../../packages/react/src/marks/aws-datasync-agent";
import { awsStorageGatewayFileGateway } from "../../packages/react/src/marks/aws-storage-gateway-file-gateway";
import { awsEfsFileSystem } from "../../packages/react/src/marks/aws-efs-file-system";
import { awsBackupVault } from "../../packages/react/src/marks/aws-backup-vault";
import { awsElasticBeanstalkApplication } from "../../packages/react/src/marks/aws-elastic-beanstalk-application";
import { azureAppService } from "../../packages/react/src/marks/azure-app-service";
import { azureMonitor } from "../../packages/react/src/marks/azure-monitor";
import { gcpCloudRun } from "../../packages/react/src/marks/gcp-cloud-run";
import { gcpGke } from "../../packages/react/src/marks/gcp-gke";
import { gcpCloudSql } from "../../packages/react/src/marks/gcp-cloud-sql";
import { kubernetes } from "../../packages/react/src/marks/kubernetes";
import { azureFunctions } from "../../packages/react/src/marks/azure-functions";
import { azureStorageAccount } from "../../packages/react/src/marks/azure-storage-account";
import { azureCosmosDb } from "../../packages/react/src/marks/azure-cosmos-db";
import { azureSqlDatabase } from "../../packages/react/src/marks/azure-sql-database";
import { azureAks } from "../../packages/react/src/marks/azure-aks";
import { azureServiceBus } from "../../packages/react/src/marks/azure-service-bus";
import { azureEventHubs } from "../../packages/react/src/marks/azure-event-hubs";
import { azureKeyVault } from "../../packages/react/src/marks/azure-key-vault";
import { azureFrontDoor } from "../../packages/react/src/marks/azure-front-door";
import { azureApiManagement } from "../../packages/react/src/marks/azure-api-management";
import { azureEntraId } from "../../packages/react/src/marks/azure-entra-id";
import { gcpComputeEngine } from "../../packages/react/src/marks/gcp-compute-engine";
import { gcpCloudStorage } from "../../packages/react/src/marks/gcp-cloud-storage";
import { gcpBigquery } from "../../packages/react/src/marks/gcp-bigquery";
import { gcpVertexAi } from "../../packages/react/src/marks/gcp-vertex-ai";
import { gcpPubsub } from "../../packages/react/src/marks/gcp-pubsub";
import { gcpCloudFunctions } from "../../packages/react/src/marks/gcp-cloud-functions";
import { awsStepFunctions } from "../../packages/react/src/marks/aws-step-functions";
import { awsKinesis } from "../../packages/react/src/marks/aws-kinesis";
import { awsFargate } from "../../packages/react/src/marks/aws-fargate";
import { awsSecretsManager } from "../../packages/react/src/marks/aws-secrets-manager";
import { awsCognito } from "../../packages/react/src/marks/aws-cognito";
import { awsEks } from "../../packages/react/src/marks/aws-eks";
import { awsKms } from "../../packages/react/src/marks/aws-kms";
const MARKS: Record<string, DiagramMark> = { "aws-application-load-balancer": awsApplicationLoadBalancer, "aws-network-load-balancer": awsNetworkLoadBalancer, "aws-cloudfront-distribution": awsCloudfrontDistribution, "aws-route-53-hosted-zone": awsRoute53HostedZone, "aws-api-gateway-endpoint": awsApiGatewayEndpoint, "aws-internet-gateway": awsInternetGateway, "aws-nat-gateway": awsNatGateway, "aws-ecs-service": awsEcsService, "aws-ecs-task": awsEcsTask, "aws-ecr-registry": awsEcrRegistry, "aws-ec2-instance": awsEc2Instance, "aws-lambda-function": awsLambdaFunction, "aws-s3-bucket": awsS3Bucket, "aws-dynamodb-table": awsDynamodbTable, "aws-sqs-queue": awsSqsQueue, "aws-eventbridge-event-bus": awsEventbridgeEventBus, "aws-cloudwatch-logs": awsCloudwatchLogs, "aws-cloudwatch-alarm": awsCloudwatchAlarm, "aws-parameter-store": awsParameterStore, "aws-iam-role": awsIamRole, "aws-sagemaker-model": awsSagemakerModel, "aws-bedrock": awsBedrock, "aws-client": awsClient, "aws-mobile-client": awsMobileClient, "aws-user": awsUser, "aws-users": awsUsers, "aws-internet": awsInternet, "aws-server": awsServer, "aws-database": awsDatabase, "aws-application": awsApplication, "aws-git-repository": awsGitRepository, "aws-email": awsEmail, "temporal": temporal, "sonarqube": sonarqube, "github": github, "coderabbit": coderabbit, "greptile": greptile, "blacksmith": blacksmith, "jenkins": jenkins, "servicenow": servicenow, "blazemeter": blazemeter, "aws-vpc": awsVpc, "aws-vpc-endpoints": awsVpcEndpoints, "aws-vpn-connection": awsVpnConnection, "aws-transit-gateway-attachment": awsTransitGatewayAttachment, "aws-direct-connect-gateway": awsDirectConnectGateway, "aws-app-mesh-mesh": awsAppMeshMesh, "aws-glue-data-catalog": awsGlueDataCatalog, "aws-athena-data-source-connectors": awsAthenaDataSourceConnectors, "aws-emr-cluster": awsEmrCluster, "aws-lake-formation-data-lake": awsLakeFormationDataLake, "aws-opensearch-data-node": awsOpensearchDataNode, "aws-msk-connect": awsMskConnect, "aws-eventbridge-scheduler": awsEventbridgeScheduler, "aws-eventbridge-pipes": awsEventbridgePipes, "aws-dynamodb-accelerator": awsDynamodbAccelerator, "aws-cloudformation-stack": awsCloudformationStack, "aws-cloudtrail-lake": awsCloudtrailLake, "aws-organizations-account": awsOrganizationsAccount, "aws-ses-email": awsSesEmail, "aws-mq-broker": awsMqBroker, "aws-waf-rule": awsWafRule, "aws-shield-advanced": awsShieldAdvanced, "aws-security-hub-finding": awsSecurityHubFinding, "aws-inspector-agent": awsInspectorAgent, "aws-network-firewall-endpoints": awsNetworkFirewallEndpoints, "aws-documentdb-elastic-clusters": awsDocumentdbElasticClusters, "aws-dms-migration-job": awsDmsMigrationJob, "aws-rekognition-image": awsRekognitionImage, "aws-datasync-agent": awsDatasyncAgent, "aws-storage-gateway-file-gateway": awsStorageGatewayFileGateway, "aws-efs-file-system": awsEfsFileSystem, "aws-backup-vault": awsBackupVault, "aws-elastic-beanstalk-application": awsElasticBeanstalkApplication, "azure-app-service": azureAppService, "azure-monitor": azureMonitor, "gcp-cloud-run": gcpCloudRun, "gcp-gke": gcpGke, "gcp-cloud-sql": gcpCloudSql, "kubernetes": kubernetes, "azure-functions": azureFunctions, "azure-storage-account": azureStorageAccount, "azure-cosmos-db": azureCosmosDb, "azure-sql-database": azureSqlDatabase, "azure-aks": azureAks, "azure-service-bus": azureServiceBus, "azure-event-hubs": azureEventHubs, "azure-key-vault": azureKeyVault, "azure-front-door": azureFrontDoor, "azure-api-management": azureApiManagement, "azure-entra-id": azureEntraId, "gcp-compute-engine": gcpComputeEngine, "gcp-cloud-storage": gcpCloudStorage, "gcp-bigquery": gcpBigquery, "gcp-vertex-ai": gcpVertexAi, "gcp-pubsub": gcpPubsub, "gcp-cloud-functions": gcpCloudFunctions, "aws-step-functions": awsStepFunctions, "aws-kinesis": awsKinesis, "aws-fargate": awsFargate, "aws-secrets-manager": awsSecretsManager, "aws-cognito": awsCognito, "aws-eks": awsEks, "aws-kms": awsKms };

type Key = keyof typeof still;
type Spec = Record<string, unknown> & { type: string; nodes?: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>> };

/** A spec's marks as React reads them: the module for each bundled id. */
function withMarks(spec: Spec): Spec {
  if (!spec.nodes) return spec;
  return { ...spec, nodes: spec.nodes.map((n) => (typeof n.mark === "string" ? { ...n, mark: MARKS[n.mark] } : n)) };
}
/** One CIMIP figure, animated: the still fixture with what diagram-motion.json adds (test/diagram-motion-fixture.mjs does the same for the tests). */
function animated(key: Key): Spec {
  const extra = (motion.cimip as Record<string, Record<string, unknown>>)[key]!;
  const { flow = [], marks = {}, ...keys } = extra as { flow?: string[][]; marks?: Record<string, string> };
  const spec = { ...(structuredClone(still[key]) as unknown as Spec), ...keys };
  if (spec.edges) spec.edges = spec.edges.map((e) => (flow.some(([f, t]) => f === e.from && t === e.to) ? { ...e, flow: true } : e));
  if (spec.nodes) spec.nodes = spec.nodes.map((n) => (marks[String(n.id)] ? { ...n, mark: marks[String(n.id)] } : n));
  return withMarks(spec);
}

/** The screenshot build opens each step with ?shot=1; the live walkthrough is opened without it. */
const isShot = () => typeof location !== "undefined" && new URLSearchParams(location.search).get("shot") === "1";
/** The walkthrough's stage gives a demo about 830px, under the width a schema, a data flow and this flowchart draw at; live, each is given the shots' 1104
 *  and scrolls, so it is drawn and its motion can be seen. */
const LIVE_WIDTH = 1104;
const LIVE_WIDE = ["schema", "data-flow", "flowchart"];

const frames = (n: number) => new Promise<void>((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); });
const until = async (test: () => boolean, limit = 8000) => { const end = performance.now() + limit; while (!test() && performance.now() < end) await frames(1); return test(); };

/** Holds a figure at a pose (see the top of this file). The state's media suffix is the build's; the pose is the name before it. */
async function pose(fig: HTMLElement, state: string) {
  const name = state.replace(/-(reduced-motion|forced-colours|more-contrast)$/, "");
  const anims = () => fig.getAnimations({ subtree: true });
  // A layout with no lines (a stacked sequence or schema) is as still: there is nothing to pose.
  await frames(6);
  if (!fig.querySelector(".basalt-diagram-edge")) return;
  const settleNow = () => { if (fig.getAttribute("data-entrance") !== "done") { fig.setAttribute("data-entrance", "done"); fig.dispatchEvent(new Event("basalt-diagram-settle")); } };
  if (name === "default" || name === "entrance") {
    // The entrance part-way: every animation of it shares one start, so one time holds them all where the entrance is.
    if (!(await until(() => fig.getAttribute("data-entrance") === "running"))) return;
    await frames(2);
    const list = anims().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    const end = Math.max(...list.map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0)));
    for (const a of list) { a.pause(); a.currentTime = end * 0.45; }
    fig.setAttribute("data-entrance", "posed");
    return;
  }
  if (name === "held" || name === "settled-plain") { settleNow(); return; }
  if (name === "run") {
    fig.querySelector<HTMLButtonElement>(".basalt-diagram-play")?.click();
    // The fourth message, its dot half-way (or, under reduced motion, its number lifting): the run is held there.
    await until(() => (fig.querySelectorAll(".basalt-diagram-msg")[3]?.hasAttribute("data-arrival") ?? false) || false, 12000);
    for (const a of anims()) a.pause();
    return;
  }
  settleNow();
  if (name === "settled") {
    // A loop part-way: the bead or the dot half along its line.
    await until(() => anims().some((a) => { const t = a.effect?.getComputedTiming(); const target = (a.effect as KeyframeEffect | null)?.target as Element | null; const travels = (a.effect as KeyframeEffect | null)?.getKeyframes().some((k) => "offsetDistance" in k || "strokeDashoffset" in k); return Boolean(target?.closest(".basalt-diagram-bead, .basalt-diagram-packet")) && Boolean(travels) && (t?.progress ?? 0) > 0.45 && t?.iterations !== Infinity; }), 12000);
    for (const a of anims()) a.pause();
    return;
  }
  if (name === "arrival") {
    await until(() => Boolean(fig.querySelector(".basalt-diagram-node[data-arrival]")), 15000);
    await frames(24);
    for (const a of anims()) a.pause();
  }
}

function Diagram({ spec, state }: { spec: Spec; state: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  const shot = isShot();
  // The held state's hold, set before the figure is first drawn and taken off when the step goes, so it never reaches another step.
  React.useLayoutEffect(() => {
    if (!shot || !state.startsWith("held")) return undefined;
    const root = document.documentElement;
    const was = root.getAttribute("data-loops");
    root.setAttribute("data-loops", "held");
    return () => { if (was === null) root.removeAttribute("data-loops"); else root.setAttribute("data-loops", was); };
  }, [shot, state]);
  React.useEffect(() => {
    const fig = host.current?.querySelector("figure");
    if (!fig || !shot) return;
    if (state === "print") return;
    let ready: () => void = () => {};
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = new Promise<void>((resolve) => { ready = resolve; });
    pose(fig, state).then(() => frames(4)).then(() => ready());
  }, [state, shot]);
  const { type, ...props } = spec;
  const figure = (() => {
    switch (type) {
      case "architecture": return <ArchitectureDiagram {...(props as unknown as React.ComponentProps<typeof ArchitectureDiagram>)} />;
      case "flowchart": return <FlowchartDiagram {...(props as unknown as React.ComponentProps<typeof FlowchartDiagram>)} />;
      case "data-flow": return <DataFlowDiagram {...(props as unknown as React.ComponentProps<typeof DataFlowDiagram>)} />;
      case "sequence": return <SequenceDiagram {...(props as unknown as React.ComponentProps<typeof SequenceDiagram>)} />;
      default: return <SchemaDiagram {...(props as unknown as React.ComponentProps<typeof SchemaDiagram>)} />;
    }
  })();
  if (!shot && LIVE_WIDE.includes(type)) {
    return <div style={{ overflowX: "auto" }}><div ref={host} style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", width: LIVE_WIDTH + 48, boxSizing: "border-box" }}>{figure}</div></div>;
  }
  return <div ref={host} style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", maxWidth: 1104 + 48, boxSizing: "border-box" }}>{figure}</div>;
}

/** Every bundled mark in a card's seat, on a card and on the focal card, in the theme of the shot: with both themes that is all four grounds. */
function MarkSheet() {
  const manifest = Object.keys(MARKS);
  const card = (id: string, focal: boolean) => (
    <div key={`${id}-${focal}`} className="basalt-diagram-node" data-mark="" data-focal={focal ? "" : undefined} style={{ position: "relative", minHeight: 56 }}>
      <span className="basalt-diagram-mark" aria-hidden="true" style={{ "--_ml": `url("${MARKS[id]!.onLight}")`, "--_md": `url("${MARKS[id]!.onDark ?? MARKS[id]!.onLight}")` } as React.CSSProperties} />
      <span className="basalt-diagram-kind">{id}</span>
      <span className="basalt-diagram-name">{focal ? "Focal card" : "Card"}</span>
    </div>
  );
  return (
    <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)" }}>
      <figure className="basalt-diagram" data-type="architecture" style={{ margin: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {manifest.flatMap((id) => [card(id, false), card(id, true)])}
        </div>
      </figure>
    </div>
  );
}

const COMMON = [
  "Decided by the council (DECISIONS 292, revised after Neon's final position; the answers are 293): the owner sees this PR before it merges. Reviewed once (Neon on the code, 4/10; Fable on the pixels, 5/10) and fixed; the fixes have not been reviewed again, and the tests were written but not run.",
  "Still is the default and is the merged drawing, unchanged, with no motion code loaded. motion=\"animated\" adds an entrance when the figure comes into view (two fifths of it), once a page load, and whichever of flow, a pulse or a packet the data names.",
  "Every word is at rest from the first frame. Each line is revealed on its own, at speed-diagram-trace between duration-diagram-line-min and -line-max, duration-diagram-stagger apart, inside duration-diagram-limit (five seconds); a head fades in as its line is 85% drawn.",
  "It settles at once on a hover or focus of a node, a key in the drawing, a control, the hold, print, reduced motion or forced colours, and new data. Measuring again (the faces arriving, a resize) never restarts, hides or cuts short an entrance.",
];
const TRY = [
  "Scroll the figure into view from below: it draws once. Reload with it on the first screen: it draws at once, and the faces arriving 20ms in do not stop it.",
  "Hover a card while it draws: every line is whole at once, then the trace. Press \"Pause animations\" in the foot: the loops clear to rest (solid lines, no bead, no dot) and every such control on the page follows.",
  "Turn on reduced motion or forced colours (DevTools' rendering emulation): the figure is still, with no pause control. Print it: every line, every label in its resting ink, no mover.",
];
const W = [1440, 390];

export const ROUND_65: Round = {
  id: "65",
  title: "Diagram motion and service marks (DECISIONS 292)",
  reviewed: false,
  summary:
    "An opt-in motion=\"animated\" on the five diagrams (an entrance on view; flow, a pulse or a packet where the data names them; a sequence's run; \"Pause animations\" in the foot) and a service's own mark on an architecture card (104 bundled, recorded in a manifest: 37 their owners' files, and Bedrock, Jenkins, ServiceNow and BlazeMeter unofficial, DECISIONS 297). Built by Opus from the council's decision (DECISIONS 292, after the handoff 287 to 291 and the answers 293), reviewed once (Neon on the code, Fable on the pixels) and fixed; the fixes have not been reviewed again, and the tests were written but not run (the owner skipped test work). Still is unchanged. On this page every figure plays as it would in an app; each screenshot of motion is a pose held by the shot, at 1440 and 390 in both themes, with reduced motion, forced colours, more contrast and print.",
  steps: [
    {
      id: "architecture",
      name: "Architecture: trace, flow, pulse, marks",
      intro: "CIMIP's architecture, animated: its lines draw in the author's order, HTTP + SSE flows, a bead runs Browser to ALB to the cimip service, and the AWS cards carry AWS's own marks.",
      decisions: [
        ...COMMON,
        "Flow: cuts of size-cut in the ground every size-diagram-flow (10 on, 2 off), marching toward the head at speed-diagram-flow, and only while they move: held, traced, still or printed the line is solid, so the key stays true. A line with under 48px showing does not flow.",
        "Pulse: a solid bead of size-diagram-bead (never more than two fifths of the line showing), a hairline proud of its line on each side, at speed-diagram-pulse; it leaves from under the source card's edge and is taken in at the line's end; each card takes its arrival step (its rim diagram-hit; the focal card's fill diagram-focal-hit) for duration-diagram-rest.",
        "Marks: 16px in the card's top end corner, nothing behind them, the owner's file and colours. The first line keeps space-6 clear. Bedrock carries its unofficial mark (the service icon with its tile removed, DECISIONS 297); Browser and Production carry none; Aurora's card takes AWS's general database mark (its own icons carry lettering).",
        "Departures from the confirmed prototype, for the owner: one-colour marks are their owner's black or white, not Basalt's grey; pausing is the page's hold; the kind line keeps 24px clear, not 20; under more contrast the arrival rim is primary ink.",
      ],
      tryIt: TRY,
      states: ["settled", "arrival", "held", "settled-plain-reduced-motion", "settled-plain-forced-colours@1440", "arrival-more-contrast@1440", "print@1440"],
      widths: W,
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram spec={animated("architecture")} state={state} />,
    },
    {
      id: "data-flow",
      name: "Data flow: trace and a repeating packet",
      intro: "How one message reaches everyone in the room: a dot carries the message from step 1 to step 5 (about 5 seconds), then again 4.55 seconds after it lands.",
      decisions: [
        ...COMMON,
        "Packet: a size-dot dot in the main ink with a hairline ring in the ground (a plate, not a glow). A leg at speed-diagram-packet between duration-diagram-leg-min and -leg-max on ease-in-out; it stops space-1 short of the line's end, so it never covers the head, and is taken in over duration-base as the stop takes its arrival step.",
        "The SSE line is on the packet's path, so it does not flow: one mover a figure, and flow never on the mover's line (departure 5).",
        "Drawn only from 1,080 (as merged); stacked below it, where the packet still runs on the stacked lines.",
      ],
      tryIt: TRY,
      states: ["settled", "arrival", "settled-plain-reduced-motion", "print@1440"],
      widths: W,
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram spec={animated("dataFlow")} state={state} />,
    },
    {
      id: "sequence",
      name: "Sequence: the entrance and the run",
      intro: "An @agent run: the arrows draw in message order while each label lifts from secondary to primary ink; \"Play the run\" sends a dot through every message.",
      decisions: [
        ...COMMON,
        "Every word is at rest: before its turn a message's label is secondary ink (still 4.5:1), and it lifts to primary over duration-slower; duration-base later its arrow draws over duration-diagram-arrow. The 12 messages end at 4.3s (departure 4).",
        "The run: a packet travels each arrow in order; at each arrival the number lifts and the receiver's head takes its step. It may pass five seconds; while it runs the button reads \"Stop the run\". The hold does not stop it. Under reduced motion it steps by colour alone.",
        "Stacked (the phone), a sequence has no lines, so it is as still: no pending state, no motion and no control.",
      ],
      tryIt: TRY,
      states: ["run@1440", "run-reduced-motion@1440", "print@1440"],
      widths: W,
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram spec={animated("sequence")} state={state} />,
    },
    {
      id: "flowchart",
      name: "Flowchart: trace",
      intro: "Who may decide what the agent asks to run: the entrance only, because a decision is not a stream or an event.",
      decisions: [...COMMON],
      tryIt: TRY,
      states: ["settled-plain"],
      widths: W,
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram spec={animated("flowchart")} state={state} />,
    },
    {
      id: "schema",
      name: "Schema: trace, top to bottom",
      intro: "The tables an incident and its runs live in: a schema's lines are derived, so they draw by where each starts, top to bottom, then start to end.",
      decisions: [...COMMON, "Stacked (the phone), a schema draws no lines, so it is as still."],
      tryIt: TRY,
      states: ["settled-plain"],
      widths: W,
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram spec={animated("schema")} state={state} />,
    },
    {
      id: "kit",
      name: "The kit: nine brands' marks",
      intro: "How a change reaches production: GitHub, CodeRabbit, Greptile, Blacksmith, SonarQube and Temporal carry their own marks; Jenkins, BlazeMeter and ServiceNow carry unofficial ones.",
      decisions: [
        "A mark is its owner's file and Basalt never recolours it: a form for light grounds and one for dark, and the focal card takes the other theme's. Greptile's and Blacksmith's dark forms are the one swap of their one fill for white. CodeRabbit is its orange mark on both grounds, as its terms give.",
        "Every mark is fitted to its own artwork, so Temporal and SonarQube draw larger than in the prototype (departure 3).",
        "Jenkins, ServiceNow and BlazeMeter carry unofficial marks, at the owner's word (DECISIONS 297, overriding 292's drop): Simple Icons' Jenkins head and BlazeMeter mark and Devicon's ServiceNow ring, each one-colour, black on light grounds and white on dark. ServiceNow's green was 1.83:1 on a light card.",
      ],
      tryIt: ["Turn on forced colours: no mark is drawn, and the first line keeps no padding for one. Print: each mark prints, whatever the Background graphics setting."],
      states: ["settled", "settled-plain-forced-colours@1440", "print@1440"],
      widths: W,
      scales: [2],
      height: 1600,
      touch: true,
      demo: ({ state }) => <Diagram spec={withMarks(structuredClone(motion.kit) as unknown as Spec)} state={state} />,
    },
    {
      id: "marks",
      name: "Every mark, on a card and on the focal card",
      intro: "The 104 bundled marks at 16px in the seat. In the dark and light shots together, each is on all four grounds: the card and the focal card of each theme.",
      decisions: [
        "Every ink is 3:1 or more on levels 1 to 3 in both themes, but for the 17 multi-colour marks of Azure and Google Cloud (DECISIONS 303), each recorded in the manifest at its measured ratio and named in the test. On the dark theme's focal card four inks are under it and recorded by name: AWS's orange (2.58), green (2.59) and teal (2.57), and CodeRabbit's orange (2.71). Accepted: the mark is decoration beside a name at 17.9:1, and each alternative is worse.",
        "Each is recorded in packages/react/marks/manifest.json: its source and terms, the date it was fetched, its hash, its forms and inks, and what was done to the file (stripped, fitted, swapped); for the eleven unofficial marks (Bedrock, Jenkins, ServiceNow, BlazeMeter, and the tile-removed service icons of Step Functions, Kinesis, Fargate, Secrets Manager, Cognito, EKS and KMS; DECISIONS 297, 303), every edit made before those.",
      ],
      tryIt: ["Open THIRD-PARTY-MARKS.md in the package: each owner, and that each mark is its owner's trademark and not under the package's licence."],
      states: ["forced-colours@1440", "print@1440"],
      widths: [1440],
      scales: [2],
      height: 1600,
      demo: () => <MarkSheet />,
    },
  ],
};
