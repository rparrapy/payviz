'use strict';

/**
 * @ngdoc function
 * @name payvizApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the payvizApp
 */
angular.module('payvizApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    var contratos = _.chain(imputaciones)
      .groupBy(function(imputacion){return imputacion.cod_contrato})
      .map(function(imputacionesPorContrato){
        var contrato = imputacionesPorContrato[0];
        contrato.imputaciones = _.map(imputacionesPorContrato, function(imputacion){
          return {fecha: imputacion.fecha, monto: imputacion.monto};
        });
        contrato.rubro_nombre = contrato.rubro_nombre.trim();
        delete contrato.monto
        return contrato;
      }).value();

    console.log(contratos.length);
    $scope.data = contratos;
    //$scope.$apply();
  });
