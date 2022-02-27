import type { NsGraphCmd } from "@antv/xflow";
import {
  createCmdConfig,
  DisposableCollection,
  XFlowGraphCommands
} from "@antv/xflow";
import type { IApplication } from "@antv/xflow";
import type { IGraphPipelineCommand } from "@antv/xflow";
import { MockApi } from "./service";
import { commandContributions } from "./cmd-extensions";
import type { NsNodeCmd, NsEdgeCmd } from "@antv/xflow-core";
import { CustomXFlowNode } from "./react-node/custom-xflow-node";

export const useCmdConfig = createCmdConfig((config) => {
  // 注册全局Command扩展
  config.setCommandContributions(() => commandContributions);
  // 设置hook
  config.setRegisterHookFn((hooks) => {
    const list = [
      hooks.graphMeta.registerHook({
        name: "get graph meta from backend",
        handler: async (args) => {
          args.graphMetaService = MockApi.queryGraphMeta;
        }
      }),
      hooks.saveGrpahData.registerHook({
        name: "save graph data",
        handler: async (args) => {
          if (!args.saveGraphDataService) {
            args.saveGraphDataService = MockApi.saveGraphData;
          }
        }
      }),
      hooks.addNode.registerHook({
        name: "get node config from backend api",
        handler: async (args) => {
          args.createNodeService = MockApi.addNode;
        }
      }),
      ///Overridding Hooks
      /* eslint-disable-next-line */
      hooks.addNode.registerHook({
        name: "after-dag-add-node",
        after: "dag-add-node",
        handler: async (args) => {
          // store current cellfactory
          const origCellFactory = args.cellFactory;
          // Override default XFlowNode factory
          const cellFactory: NsNodeCmd.AddNode.IArgs["cellFactory"] = async (
            nodeConfig,
            self
          ) => {
            /* eslint-disable-next-line @typescript-eslint/no-this-alias */
            /*
            const node = await origCellFactory(nodeConfig, self);
            debugger;

            return node;
            //*/
            const node = new CustomXFlowNode({
              ...nodeConfig
            });
            return node;
          };
          args.cellFactory = cellFactory;
        }
      }),
      hooks.delNode.registerHook({
        name: "get edge config from backend api",
        handler: async (args) => {
          args.deleteNodeService = MockApi.delNode;
        }
      }),
      hooks.addEdge.registerHook({
        name: "after-dag-add-edge",
        after: "dag-add-edge",
        handler: async (args) => {
          // store current cellfactory
          const origCellFactory = args.cellFactory;
          const cellFactory: NsEdgeCmd.AddEdge.IArgs["cellFactory"] = async (
            edgeConfig,
            self
          ) => {
            /* eslint-disable-next-line @typescript-eslint/no-this-alias */
            const cell = await origCellFactory(edgeConfig, self);
            // Override default XFlowEdge factory
            cell.attr(edgeConfig.attrs);
            return cell;
          };
          args.cellFactory = cellFactory;
        }
      }),
      hooks.addEdge.registerHook({
        name: "get edge config from backend api",
        handler: async (args) => {
          args.createEdgeService = MockApi.addEdge;
          const attrs = {
            line: {
              stroke: "green",
              strokeWidth: 1,
              targetMarker: {
                name: "block",
                args: {
                  size: 6
                }
              }
            }
          };

          args.edgeConfig = {
            ...args.edgeConfig,
            //anchor: "orth",
            //connectionPoint: "boundary",
            router: { name: "manhattan" },
            connector: { name: "rounded" },

            attrs
          };
        }
      }),
      hooks.delEdge.registerHook({
        name: "get edge config from backend api",
        handler: async (args) => {
          args.deleteEdgeService = MockApi.delEdge;
        }
      })
    ];
    const toDispose = new DisposableCollection();
    toDispose.pushAll(list);
    return toDispose;
  });
});

/** 查询图的节点和边的数据 */
export const initGraphCmds = (app: IApplication) => {
  app.executeCommandPipeline([
    /** 1. 从服务端获取数据 */
    {
      commandId: XFlowGraphCommands.LOAD_DATA.id,
      getCommandOption: async () => {
        return {
          args: {
            loadDataService: MockApi.loadGraphData
          }
        };
      }
    } as IGraphPipelineCommand<NsGraphCmd.GraphLoadData.IArgs>,
    /** 2. 执行布局算法 */
    {
      commandId: XFlowGraphCommands.GRAPH_LAYOUT.id,
      getCommandOption: async (ctx) => {
        const { graphData } = ctx.getResult();
        return {
          args: {
            layoutType: "dagre",
            layoutOptions: {
              type: "dagre",
              /** 布局方向 */
              rankdir: "TB",
              /** 节点间距 */
              nodesep: 60,
              /** 层间距 */
              ranksep: 30
            },
            graphData
          }
        };
      }
    } as IGraphPipelineCommand<NsGraphCmd.GraphLayout.IArgs>,
    /** 3. 画布内容渲染 */
    {
      commandId: XFlowGraphCommands.GRAPH_RENDER.id,
      getCommandOption: async (ctx) => {
        const { graphData } = ctx.getResult();
        return {
          args: {
            graphData
          }
        };
      }
    } as IGraphPipelineCommand<NsGraphCmd.GraphRender.IArgs>,
    /** 4. 缩放画布 */
    {
      commandId: XFlowGraphCommands.GRAPH_ZOOM.id,
      getCommandOption: async () => {
        return {
          args: {
            factor: "fit",
            zoomOptions: { maxScale: 4, factor: 1.1, minScale: 0.9 }
          }
        };
      }
    } as IGraphPipelineCommand<NsGraphCmd.GraphZoom.IArgs>
  ]);
};
