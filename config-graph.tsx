import type { IProps } from "./index";
import type { NsNodeCmd } from "@antv/xflow";
import { NsGraph, XFlowNodeCommands } from "@antv/xflow";
import {
  createHookConfig,
  DisposableCollection,
  createGraphConfig
} from "@antv/xflow";
import { DND_RENDER_ID, GROUP_NODE_RENDER_ID } from "./constant";
import { AlgoNode } from "./react-node/algo-node";
import { GroupNode } from "./react-node/group";
import { registerNewNode } from "./react-node/node";
import { NsAddEdgeEvent } from "@antv/xflow-extension/es/canvas-dag-extension/contributions/dag";
import { XFlowEdge } from "@antv/xflow-extension/es/canvas-dag-extension/x6-extension/edge";
import { XFlowNode } from "@antv/xflow-extension/es/canvas-dag-extension/x6-extension/node";

import type { EventArgs } from "@antv/x6/lib/graph/events";
import type { Graph } from "@antv/x6";

//registerNewNode();

export const useGraphConfig = createGraphConfig((config) => {
  //debugger;
  console.log("createGraphConfig");
  /** 预设XFlow画布配置项 */

  config.setX6Config({
    scaling: {
      min: 0.2,
      max: 3
    }
  });

  //config.setNodeRender('NODE1', props => <Node1 {...props} />)
  //config.setNodeRender('NODE2', Node2)
  //config.setEdgeRender('EDGE1', props => <Edge1 {...props} />)
  //config.setEdgeRender('EDGE2', props => <Edge2 {...props} />)
});

export const useGraphHookConfig = createHookConfig<IProps>((config, proxy) => {
  // 获取 Props
  const props = proxy.getValue();
  console.log("get main props", props);
  config.setRegisterHook((hooks) => {
    const disposableList = [
      // 注册增加 react Node Render
      hooks.reactNodeRender.registerHook({
        name: "add react node",
        handler: async (renderMap) => {
          renderMap.set(DND_RENDER_ID, AlgoNode);
          renderMap.set(GROUP_NODE_RENDER_ID, GroupNode);
        }
      }),
      // 注册修改graphOptions配置的钩子
      hooks.graphOptions.registerHook({
        name: "custom-x6-options",
        after: "dag-extension-x6-options",
        handler: async (options) => {
          //debugger;
          // Store current create Edge
          const graphOptions: Graph.Options = {
            scaling: {
              min: 0.2,
              max: 3
            },
            connecting: {
              // Edge settings
              /*
              anchor: "orth",
              connector: "rounded", 
              router: {
                name: "manhattan"
              },
              connectionPoint: "boundary",
              //*/
              // 是否触发交互事件
              validateMagnet() {
                // return magnet.getAttribute('port-group') !== NsGraph.AnchorGroup.TOP
                return true;
              },
              // 显示可用的链接桩
              validateConnection({
                sourceView,
                targetView,
                sourceMagnet,
                targetMagnet
              }) {
                // 不允许连接到自己
                if (sourceView === targetView) {
                  return false;
                }
                // 只能从上游节点的输出链接桩创建连接
                // if ( sourceMagnet.getAttribute('port-group') === NsGraph.AnchorGroup.TOP) {
                //   return false
                // }
                // 只能连接到下游节点的输入桩
                // if (targetMagnet.getAttribute('port-group') !== NsGraph.AnchorGroup.TOP) {
                //   return false
                // }
                // 没有起点的返回false
                if (!sourceMagnet) {
                  return false;
                }
                if (!targetMagnet) {
                  return false;
                }
                const node = targetView!.cell as any;
                // 判断目标链接桩是否可连接
                const portId = targetMagnet.getAttribute("port")!;
                const port = node.getPort(portId);
                return !!port;
              },
              createEdge() {
                /* eslint-disable-next-line @typescript-eslint/no-this-alias */
                const graph = this;
                const edge = new XFlowEdge({
                  attrs: {
                    line: {
                      strokeDasharray: "5 5",
                      stroke: "green",
                      strokeWidth: 1,
                      targetMarker: {
                        name: "block",
                        args: {
                          size: 6,
                          offset: -6
                        }
                      }
                    }
                  }
                });

                const addEdge = (args: EventArgs["edge:connected"]) => {
                  const { isNew } = args;
                  const edgeCell = args.edge;
                  /** 没有edge:connected时，会导致graph.once的事件没有执行 */
                  if (isNew && edgeCell.isEdge() && edgeCell === edge) {
                    const portId = edgeCell.getTargetPortId();
                    const targetNode = edgeCell.getTargetCell();
                    if (targetNode && targetNode.isNode()) {
                      targetNode.setPortProp(portId, "connected", false);
                      edgeCell.attr({
                        line: {
                          strokeDasharray: "none"
                        }
                      });

                      /*
                      const targetPortId = edgeCell.getTargetPortId();
                      const sourcePortId = edgeCell.getSourcePortId();
                      const sourceCellId = edgeCell.getSourceCellId();
                      const targetCellId = edgeCell.getTargetCellId();
                      
                      graph.trigger(NsAddEdgeEvent.EVENT_NAME, {
                        targetPortId,
                        sourcePortId,
                        source: sourceCellId,
                        target: targetCellId,
                        edge: edge
                      } as NsAddEdgeEvent.IArgs);//*/
                    }
                  }
                };
                graph.once("edge:connected", addEdge);
                return edge;
              }
            }
          };

          options.connecting = {
            ...options.connecting,
            ...graphOptions.connecting
          };
          //*/
          // Merge configurations
          //Object.assign(options, graphOptions);
          console.log(options);
        }
      }),
      // 注册增加 graph event
      hooks.x6Events.registerHook({
        name: "add",
        handler: async (events) => {
          events.push({
            eventName: "node:moved",
            callback: (e, cmds) => {
              const { node } = e;
              cmds.executeCommand<NsNodeCmd.MoveNode.IArgs>(
                XFlowNodeCommands.MOVE_NODE.id,
                {
                  id: node.id,
                  position: node.getPosition()
                }
              );
            }
          } as NsGraph.IEvent<"node:moved">);
        }
      })
    ];
    const toDispose = new DisposableCollection();
    toDispose.pushAll(disposableList);
    return toDispose;
  });
});
