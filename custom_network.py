from flask import Blueprint, request, jsonify
import logging
import psutil
import json
from database import get_db_connection

custom_network_bp = Blueprint('custom_network', __name__, url_prefix='/custom_network')

def load_custom_network_graphs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, graph_name, interfaces FROM custom_network_graphs")
    rows = cursor.fetchall()
    graphs = []
    for row in rows:
        graphs.append({
            "id": row["id"],
            "graph_name": row["graph_name"],
            "interfaces": json.loads(row["interfaces"]) if row["interfaces"] else []
        })
    conn.close()
    return graphs

def add_custom_network_graphs(new_graphs):
    """
    Adds or updates new graphs without deleting existing configuration.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    for graph in new_graphs:
        interfaces_json = json.dumps(graph.get("interfaces", []))
        cursor.execute(
            "INSERT OR REPLACE INTO custom_network_graphs (id, graph_name, interfaces) VALUES (?, ?, ?)",
            (graph.get("id"), graph.get("graph_name"), interfaces_json)
        )
    conn.commit()
    conn.close()

@custom_network_bp.route('/config', methods=['GET'])
def get_config():
    """Return the current custom network graphs configuration."""
    graphs = load_custom_network_graphs()
    return jsonify(graphs)

@custom_network_bp.route('/config', methods=['POST'])
def update_config():
    """
    Update the custom network graphs configuration by adding or replacing graphs.
    Expected JSON format:
      {
        "custom_network_graphs": [
           {
             "id": ...,
             "graph_name": ...,
             "interfaces": [
               {"iface_name": ..., "label": ..., "color": ...}, ...
             ]
           },
           ...
        ]
      }
    This will add or update the provided graphs, but won't overwrite existing ones
    that aren't included in the request.
    """
    data = request.get_json()
    new_graphs = data.get('custom_network_graphs', [])
    add_custom_network_graphs(new_graphs)
    graphs = load_custom_network_graphs()
    logging.info("Custom network configuration updated: %s", graphs)
    return jsonify({'status': 'success', 'custom_network_graphs': graphs})

@custom_network_bp.route('/available_interfaces', methods=['GET'])
def available_interfaces():
    """
    Returns a list of all network interfaces available on the host.
    Uses psutil.net_if_addrs() under the hood.
    """
    interfaces = list(psutil.net_if_addrs().keys())
    return jsonify(interfaces)

@custom_network_bp.route('/delete/<int:graph_id>', methods=['DELETE'])
def delete_custom_network_graph(graph_id):
    """
    Delete a custom network graph by its ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM custom_network_graphs WHERE id = ?", (graph_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'deleted': graph_id})
