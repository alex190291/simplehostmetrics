# simplehostmetrics.refac/network_graph.py
from flask import Blueprint, request, jsonify
import psutil
from models import db, CustomNetworkGraph

network_graph_bp = Blueprint('network_graph', __name__, url_prefix='/network_graph')

@network_graph_bp.route('/config', methods=['GET'])
def get_config():
    graphs = CustomNetworkGraph.query.all()
    result = []
    for graph in graphs:
        result.append({
            'id': graph.id,
            'graph_name': graph.graph_name,
            'interfaces': graph.interfaces
        })
    return jsonify(result)

@network_graph_bp.route('/config', methods=['POST'])
def update_config():
    """
    Erwartetes JSON-Format:
    {
      "custom_network_graphs": [
         { "id": optional, "graph_name": "Name", "interfaces": [ { "iface_name": ..., "label": ..., "color": ... }, ... ] },
         ...
      ]
    }
    """
    data = request.get_json()
    graphs_data = data.get('custom_network_graphs', [])
    updated_graphs = []
    for graph_data in graphs_data:
        graph_id = graph_data.get('id')
        if graph_id:
            graph = CustomNetworkGraph.query.get(graph_id)
            if not graph:
                graph = CustomNetworkGraph(id=graph_id)
                db.session.add(graph)
        else:
            graph = CustomNetworkGraph()
            db.session.add(graph)
        graph.graph_name = graph_data.get('graph_name')
        graph.interfaces = graph_data.get('interfaces', [])
        updated_graphs.append(graph)
    db.session.commit()
    return jsonify({
        'status': 'success',
        'custom_network_graphs': [
            {'id': g.id, 'graph_name': g.graph_name, 'interfaces': g.interfaces} for g in updated_graphs
        ]
    })

@network_graph_bp.route('/available_interfaces', methods=['GET'])
def available_interfaces():
    interfaces = list(psutil.net_if_addrs().keys())
    return jsonify(interfaces)

@network_graph_bp.route('/<int:graph_id>', methods=['DELETE'])
def delete_graph(graph_id):
    graph = CustomNetworkGraph.query.get(graph_id)
    if not graph:
        return jsonify({'status': 'error', 'message': 'Graph not found'}), 404
    db.session.delete(graph)
    db.session.commit()
    return jsonify({'status': 'success', 'deleted': graph_id})
