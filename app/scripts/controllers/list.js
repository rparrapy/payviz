'use strict';

/**
 * @ngdoc function
 * @name payvizApp.controller:ListCtrl
 * @description
 * # ListCtrl
 * Controller of the payvizApp
 */
angular.module('payvizApp')
  .controller('ListCtrl', function ($scope, DTOptionsBuilder) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    var liToSelect = 2;
    $(".nav.nav-pills li").removeClass("active");
    $(".nav.nav-pills li:eq("+(liToSelect-1)+")").addClass("active");

    var contratos = imputaciones;

    for (var i = 0; i < contratos.length; i++){
      var c = contratos[i];
      if(!c.monto_total){
        c.monto_total = _.reduce(c.imputaciones,function(sum, el) { return sum + el.monto },0);
      }
      if(!c.llamado_nombre){
        c.llamado_nombre = 'NO POSEE';
      }
    }

    contratos = _.sortBy(contratos, function(o) { return o.llamado_nombre; })

    $scope.contratos = contratos;

    console.log(contratos[0]);

    $scope.dtOptions = DTOptionsBuilder.newOptions().withPaginationType('full_numbers')
      .withOption('order', [[1, 'asc']])
      .withOption('language', {
      "sProcessing":     "Procesando...",
      "sLengthMenu":     "Mostrar _MENU_ registros",
      "sZeroRecords":    "No se encontraron resultados",
      "sEmptyTable":     "Ningún dato disponible en esta tabla",
      "sInfo":           "Registros del _START_ al _END_ de un total de _TOTAL_ registros",
      "sInfoEmpty":      "Registros del 0 al 0 de un total de 0 registros",
      "sInfoFiltered":   "(filtrado de un total de _MAX_ registros)",
      "sInfoPostFix":    "",
      "sSearch":         "Buscar:",
      "sUrl":            "",
      "sInfoThousands":  ",",
      "sLoadingRecords": "Cargando...",
      "oPaginate": {
          "sFirst":    "Primero",
          "sLast":     "Último",
          "sNext":     "Siguiente",
          "sPrevious": "Anterior"
      },
      "oAria": {
          "sSortAscending":  ": Activar para ordenar la columna de manera ascendente",
          "sSortDescending": ": Activar para ordenar la columna de manera descendente"
      }
    })
      .withBootstrap();

    $scope.$on('event:dataTableLoaded', function(event, loadedDT) {
      // Setup - add a text input to each footer cell
      var id = '#' + loadedDT.id;
      $(id + ' tfoot th').each(function() {
        var title = $(id + ' thead th').eq($(this).index()).text();
        $(this).html('<input class="form-control input-sm" style="font-size:smaller;max-width:100px;" type="text" placeholder="' + title + '" />');
      });

      var table = loadedDT.DataTable;
      // Apply the search
      table.columns().eq(0).each(function(colIdx) {
        $('input', table.column(colIdx).footer()).on('keyup change', function() {
          table
            .column(colIdx)
            .search(this.value)
            .draw();
        });
      });
    });

    //$scope.$apply();
  });
